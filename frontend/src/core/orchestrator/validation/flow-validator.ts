import { ASTNode } from '../../rule-engine/ast/types';
import { SequenceFlow, WorkflowDefinition, WorkflowNode } from '../models/definition';

export type DiagnosticSeverity = 'warning' | 'error';

export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

export interface ValidationFix {
  title: string;
  confidence: 'high' | 'medium';
  patch: JsonPatchOperation[];
}

export interface ValidationDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  location: string;
  fixes?: ValidationFix[];
}

interface ValidationContext {
  definition: WorkflowDefinition;
  nodeById: Map<string, WorkflowNode>;
  outgoing: Map<string, SequenceFlow[]>;
  incoming: Map<string, SequenceFlow[]>;
}

interface Rule {
  id: string;
  run(context: ValidationContext): ValidationDiagnostic[];
}

export interface ValidateOptions {
  changedPaths?: string[];
}

export class WorkflowDraftValidationError extends Error {
  constructor(public readonly diagnostics: ValidationDiagnostic[]) {
    super('Workflow draft contains validation errors.');
    this.name = 'WorkflowDraftValidationError';
  }
}

export class FlowValidator {
  private readonly rules: Rule[] = [
    { id: 'references', run: runReferenceRule },
    { id: 'loops', run: runInfiniteLoopRule },
    { id: 'contradictions', run: runContradictoryRuleRule },
    { id: 'unused-inputs', run: runUnusedInputRule },
    { id: 'integration-mapping', run: runIntegrationMappingRule }
  ];

  validate(definition: WorkflowDefinition, _options?: ValidateOptions): ValidationDiagnostic[] {
    const context = this.createContext(definition);
    return this.rules.flatMap(rule => rule.run(context));
  }

  private createContext(definition: WorkflowDefinition): ValidationContext {
    const nodeById = new Map(definition.nodes.map(node => [node.id, node]));
    const outgoing = new Map<string, SequenceFlow[]>();
    const incoming = new Map<string, SequenceFlow[]>();

    for (const flow of definition.flows) {
      const source = outgoing.get(flow.sourceRef) ?? [];
      source.push(flow);
      outgoing.set(flow.sourceRef, source);

      const target = incoming.get(flow.targetRef) ?? [];
      target.push(flow);
      incoming.set(flow.targetRef, target);
    }

    return { definition, nodeById, outgoing, incoming };
  }
}

function runReferenceRule(context: ValidationContext): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  for (const flow of context.definition.flows) {
    if (!context.nodeById.has(flow.sourceRef)) {
      diagnostics.push({
        code: 'BROKEN_SOURCE_REF',
        severity: 'error',
        message: `Flow ${flow.id} references unknown source node ${flow.sourceRef}.`,
        location: `/flows/${flow.id}/sourceRef`
      });
    }

    if (!context.nodeById.has(flow.targetRef)) {
      diagnostics.push({
        code: 'BROKEN_TARGET_REF',
        severity: 'error',
        message: `Flow ${flow.id} references unknown target node ${flow.targetRef}.`,
        location: `/flows/${flow.id}/targetRef`
      });
    }
  }

  return diagnostics;
}

function runInfiniteLoopRule(context: ValidationContext): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const endNodeIds = new Set(context.definition.nodes.filter(node => node.type === 'END').map(node => node.id));

  const cyclePaths = findCyclePaths(context.definition.nodes.map(node => node.id), context.outgoing);

  for (const cyclePath of cyclePaths) {
    const hasExitToEnd = cyclePath.some(nodeId => canReachEnd(nodeId, endNodeIds, context.outgoing, new Set(cyclePath)));
    if (!hasExitToEnd) {
      diagnostics.push({
        code: 'INFINITE_LOOP_RISK',
        severity: 'error',
        message: `Cycle detected (${cyclePath.join(' -> ')}) without a reachable END node outside the cycle.`,
        location: `/nodes/${cyclePath[0]}`,
        fixes: [
          {
            title: 'Add a guard condition or exit flow to an END node.',
            confidence: 'medium',
            patch: []
          }
        ]
      });
    }
  }

  return diagnostics;
}

function findCyclePaths(nodeIds: string[], outgoing: Map<string, SequenceFlow[]>): string[][] {
  const stack: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[][] = [];

  const dfs = (nodeId: string) => {
    if (visiting.has(nodeId)) {
      const idx = stack.indexOf(nodeId);
      if (idx >= 0) {
        cycles.push(stack.slice(idx));
      }
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);
    stack.push(nodeId);

    for (const flow of outgoing.get(nodeId) ?? []) {
      dfs(flow.targetRef);
    }

    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const nodeId of nodeIds) {
    dfs(nodeId);
  }

  return dedupeCycles(cycles);
}

function dedupeCycles(cycles: string[][]): string[][] {
  const keys = new Set<string>();
  const normalized: string[][] = [];

  for (const cycle of cycles) {
    if (cycle.length === 0) {
      continue;
    }

    const minNode = [...cycle].sort()[0];
    const start = cycle.indexOf(minNode);
    const ordered = cycle.slice(start).concat(cycle.slice(0, start));
    const key = ordered.join('>');

    if (!keys.has(key)) {
      keys.add(key);
      normalized.push(ordered);
    }
  }

  return normalized;
}

function canReachEnd(
  startNodeId: string,
  endNodeIds: Set<string>,
  outgoing: Map<string, SequenceFlow[]>,
  cycleNodes: Set<string>
): boolean {
  const queue = [startNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const flow of outgoing.get(current) ?? []) {
      if (cycleNodes.has(flow.targetRef) && !endNodeIds.has(flow.targetRef)) {
        continue;
      }

      if (endNodeIds.has(flow.targetRef)) {
        return true;
      }

      queue.push(flow.targetRef);
    }
  }

  return false;
}

function runContradictoryRuleRule(context: ValidationContext): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  for (const node of context.definition.nodes.filter(n => n.type === 'CONDITION')) {
    const flows = (context.outgoing.get(node.id) ?? []).filter(flow => flow.condition);
    for (let i = 0; i < flows.length; i++) {
      for (let j = i + 1; j < flows.length; j++) {
        if (areContradictory(flows[i].condition!, flows[j].condition!)) {
          diagnostics.push({
            code: 'CONTRADICTORY_RULES',
            severity: 'error',
            message: `Gateway ${node.id} has contradictory conditions between flows ${flows[i].id} and ${flows[j].id}.`,
            location: `/nodes/${node.id}`
          });
        }
      }
    }
  }

  return diagnostics;
}

function areContradictory(a: ASTNode, b: ASTNode): boolean {
  const left = extractSimpleComparison(a);
  const right = extractSimpleComparison(b);

  if (!left || !right || left.identifier !== right.identifier) {
    return false;
  }

  const sameValue = left.literal === right.literal;

  return (
    (left.operator === '==' && right.operator === '!=' && sameValue) ||
    (left.operator === '!=' && right.operator === '==' && sameValue)
  );
}

function extractSimpleComparison(node: ASTNode): { identifier: string; operator: string; literal: unknown } | null {
  if (node.type !== 'BinaryExpression' || (node.operator !== '==' && node.operator !== '!=')) {
    return null;
  }

  if (node.left.type === 'Identifier' && node.right.type === 'Literal') {
    return { identifier: node.left.name, operator: node.operator, literal: node.right.value };
  }

  if (node.left.type === 'Literal' && node.right.type === 'Identifier') {
    return { identifier: node.right.name, operator: node.operator, literal: node.left.value };
  }

  return null;
}

function runUnusedInputRule(context: ValidationContext): ValidationDiagnostic[] {
  const properties = context.definition.inputSchema?.['properties'];
  if (!properties || typeof properties !== 'object') {
    return [];
  }

  const allReferences = collectDefinitionReferences(context.definition);
  const diagnostics: ValidationDiagnostic[] = [];

  for (const fieldName of Object.keys(properties)) {
    if (!allReferences.has(fieldName)) {
      diagnostics.push({
        code: 'UNUSED_INPUT_FIELD',
        severity: 'warning',
        message: `Input field ${fieldName} is never used by nodes, flow conditions, or action payloads.`,
        location: `/inputSchema/properties/${fieldName}`,
        fixes: [
          {
            title: `Remove unused input field ${fieldName}`,
            confidence: 'high',
            patch: [{ op: 'remove', path: `/inputSchema/properties/${fieldName}` }]
          }
        ]
      });
    }
  }

  return diagnostics;
}

function collectDefinitionReferences(definition: WorkflowDefinition): Set<string> {
  const references = new Set<string>();

  for (const flow of definition.flows) {
    if (flow.condition) {
      collectIdentifiers(flow.condition, references);
    }
  }

  for (const node of definition.nodes) {
    collectPayloadReferences(node.actionPayload, references);
  }

  return references;
}

function collectIdentifiers(node: ASTNode, bucket: Set<string>): void {
  if (node.type === 'Identifier') {
    bucket.add(node.name);
    return;
  }

  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    collectIdentifiers(node.left, bucket);
    collectIdentifiers(node.right, bucket);
    return;
  }

  if (node.type === 'CallExpression') {
    for (const arg of node.arguments) {
      collectIdentifiers(arg, bucket);
    }
  }
}

function collectPayloadReferences(value: unknown, bucket: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\{\{\s*context\.([a-zA-Z0-9_]+)\s*\}\}/g)) {
      bucket.add(match[1]);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectPayloadReferences(item, bucket));
    return;
  }

  if (value && typeof value === 'object') {
    for (const childValue of Object.values(value as Record<string, unknown>)) {
      collectPayloadReferences(childValue, bucket);
    }
  }
}

function runIntegrationMappingRule(context: ValidationContext): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  for (const node of context.definition.nodes.filter(n => n.type === 'API_CALL')) {
    const payload = node.actionPayload as ServiceTaskPayload | undefined;
    if (!payload?.integrationContract) {
      continue;
    }

    const requiredFields = payload.integrationContract.required ?? [];
    const mapping = payload.integrationMapping ?? {};

    for (const requiredField of requiredFields) {
      if (!mapping[requiredField]) {
        diagnostics.push({
          code: 'INTEGRATION_REQUIRED_UNMAPPED',
          severity: 'error',
          message: `Service task ${node.id} is missing mapping for required field ${requiredField}.`,
          location: `/nodes/${node.id}/actionPayload/integrationMapping/${requiredField}`
        });
      }
    }

    for (const [targetField, sourceField] of Object.entries(mapping)) {
      if (typeof sourceField !== 'string') {
        continue;
      }

      const sourceName = sourceField.replace(/^context\./, '');
      if (!isKnownInput(sourceName, context.definition.inputSchema?.['properties'])) {
        diagnostics.push({
          code: 'INTEGRATION_SOURCE_UNKNOWN',
          severity: 'warning',
          message: `Service task ${node.id} maps ${targetField} from unknown source ${sourceField}.`,
          location: `/nodes/${node.id}/actionPayload/integrationMapping/${targetField}`
        });
      }
    }
  }

  return diagnostics;
}

function isKnownInput(field: string, properties: unknown): boolean {
  if (!properties || typeof properties !== 'object') {
    return true;
  }

  return Object.prototype.hasOwnProperty.call(properties, field);
}

interface ServiceTaskPayload {
  integrationContract?: {
    required?: string[];
  };
  integrationMapping?: Record<string, string>;
}
