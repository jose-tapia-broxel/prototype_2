import { RuleDiagnostic, RuleDocument, RuleNode } from './types';

export interface ValidationContext {
  availableFields: Set<string>;
  availableFunctions: Set<string>;
  maxDepth?: number;
  maxNodes?: number;
}

export class RuleDocumentValidator {
  validate(doc: RuleDocument, context: ValidationContext): RuleDiagnostic[] {
    const diagnostics: RuleDiagnostic[] = [];

    if (!doc.rootNodeId) {
      return diagnostics;
    }

    if (context.maxNodes && Object.keys(doc.nodes).length > context.maxNodes) {
      diagnostics.push({
        code: 'LIMIT_MAX_NODES',
        severity: 'error',
        message: `Rule exceeds maximum nodes (${context.maxNodes}).`,
        suggestion: 'Split logic into multiple rules.'
      });
    }

    const visited = new Set<string>();
    this.walk(doc.rootNodeId, doc.nodes, context, diagnostics, visited, 1);

    for (const nodeId of Object.keys(doc.nodes)) {
      if (!visited.has(nodeId)) {
        diagnostics.push({
          code: 'UNREACHABLE_NODE',
          severity: 'warning',
          message: `Node ${nodeId} is disconnected from root.`,
          nodeId
        });
      }
    }

    return diagnostics;
  }

  private walk(
    nodeId: string,
    graph: Record<string, RuleNode>,
    context: ValidationContext,
    diagnostics: RuleDiagnostic[],
    visited: Set<string>,
    depth: number
  ) {
    if (context.maxDepth && depth > context.maxDepth) {
      diagnostics.push({
        code: 'LIMIT_MAX_DEPTH',
        severity: 'error',
        message: `Rule depth exceeded (${context.maxDepth}).`,
        nodeId
      });
      return;
    }

    if (visited.has(nodeId)) {
      diagnostics.push({
        code: 'CYCLE_DETECTED',
        severity: 'error',
        message: `Cycle detected at node ${nodeId}.`,
        nodeId
      });
      return;
    }

    const node = graph[nodeId];
    if (!node) {
      diagnostics.push({
        code: 'NODE_NOT_FOUND',
        severity: 'error',
        message: `Node ${nodeId} does not exist.`,
        nodeId
      });
      return;
    }

    visited.add(nodeId);

    if (node.kind === 'group') {
      if (!node.children.length) {
        diagnostics.push({
          code: 'EMPTY_GROUP',
          severity: 'error',
          message: 'Group node has no children.',
          nodeId
        });
      }

      node.children.forEach((childId) => this.walk(childId, graph, context, diagnostics, visited, depth + 1));
      return;
    }

    if (node.kind === 'predicate') {
      if (!context.availableFields.has(node.field.id)) {
        diagnostics.push({
          code: 'UNKNOWN_FIELD',
          severity: 'error',
          message: `Field ${node.field.id} does not exist in schema.`,
          nodeId,
          path: `${nodeId}.field.id`
        });
      }

      if (node.value.source === 'field' && !context.availableFields.has(node.value.fieldId)) {
        diagnostics.push({
          code: 'UNKNOWN_VALUE_FIELD',
          severity: 'error',
          message: `Value field ${node.value.fieldId} does not exist in schema.`,
          nodeId,
          path: `${nodeId}.value.fieldId`
        });
      }

      return;
    }

    if (!context.availableFunctions.has(node.functionName)) {
      diagnostics.push({
        code: 'UNKNOWN_FUNCTION',
        severity: 'error',
        message: `Function ${node.functionName} is not registered.`,
        nodeId
      });
    }
  }
}
