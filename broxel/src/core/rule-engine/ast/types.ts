export type ASTNodeType = 'Literal' | 'Identifier' | 'BinaryExpression' | 'LogicalExpression' | 'CallExpression';

export interface BaseNode {
  type: ASTNodeType;
}

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  dataType?: 'string' | 'number' | 'boolean' | 'null';
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export type BinaryOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'IN';

export interface BinaryNode extends BaseNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

export type LogicalOperator = 'AND' | 'OR';

export interface LogicalNode extends BaseNode {
  type: 'LogicalExpression';
  operator: LogicalOperator;
  left: ASTNode;
  right: ASTNode;
}

export interface CallNode extends BaseNode {
  type: 'CallExpression';
  callee: string;
  arguments: ASTNode[];
}

export type ASTNode = LiteralNode | IdentifierNode | BinaryNode | LogicalNode | CallNode;

export interface ExecutionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functions?: Record<string, (...args: any[]) => any>;
}
