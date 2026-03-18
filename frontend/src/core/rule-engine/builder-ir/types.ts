import { BinaryOperator, LogicalOperator } from '../ast/types';

export type RuleIRVersion = '1.0';

export interface RuleDocument {
  version: RuleIRVersion;
  ruleId: string;
  rootNodeId: string | null;
  nodes: Record<string, RuleNode>;
  diagnostics?: RuleDiagnostic[];
  metadata?: {
    source: 'visual' | 'ast' | 'api';
    updatedAt: string;
    extensions?: Record<string, unknown>;
  };
}

export type RuleNode = GroupNode | PredicateNode | FunctionNode;

interface BaseRuleNode {
  id: string;
  kind: RuleNodeKind;
  ui?: {
    x?: number;
    y?: number;
    collapsed?: boolean;
  };
  annotations?: Record<string, unknown>;
}

export type RuleNodeKind = 'group' | 'predicate' | 'function';

export interface GroupNode extends BaseRuleNode {
  kind: 'group';
  combinator: LogicalOperator;
  children: string[];
}

export interface PredicateNode extends BaseRuleNode {
  kind: 'predicate';
  field: FieldRef;
  operator: BinaryOperator;
  value: ValueRef;
}

export interface FunctionNode extends BaseRuleNode {
  kind: 'function';
  functionName: string;
  arguments: ValueRef[];
}

export interface FieldRef {
  id: string;
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'unknown';
}

export type ValueRef =
  | { source: 'literal'; value: string | number | boolean | null }
  | { source: 'field'; fieldId: string }
  | { source: 'expression'; expressionId: string };

export interface RuleDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  path?: string;
  suggestion?: string;
}
