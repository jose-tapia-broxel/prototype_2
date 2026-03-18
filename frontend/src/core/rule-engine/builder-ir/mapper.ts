import { ASTNode } from '../ast/types';
import { GroupNode, PredicateNode, RuleDocument, RuleNode } from './types';

export class RuleIRMapper {
  toAst(document: RuleDocument): ASTNode | undefined {
    if (!document.rootNodeId) {
      return undefined;
    }

    return this.nodeToAst(document.rootNodeId, document.nodes);
  }

  fromAst(ast: ASTNode, ruleId = 'rule-generated'): RuleDocument {
    const nodes: Record<string, RuleNode> = {};
    const rootNodeId = this.astToNode(ast, nodes);

    return {
      version: '1.0',
      ruleId,
      rootNodeId,
      nodes,
      metadata: {
        source: 'ast',
        updatedAt: new Date().toISOString()
      }
    };
  }

  private nodeToAst(nodeId: string, nodes: Record<string, RuleNode>): ASTNode {
    const node = nodes[nodeId];

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    if (node.kind === 'predicate') {
      return {
        type: 'BinaryExpression',
        operator: node.operator,
        left: { type: 'Identifier', name: node.field.id },
        right: this.valueToAst(node.value)
      };
    }

    if (node.kind === 'group') {
      if (!node.children.length) {
        throw new Error(`Group ${node.id} has no children`);
      }

      return node.children
        .map((childId) => this.nodeToAst(childId, nodes))
        .reduce((left, right) => ({
          type: 'LogicalExpression',
          operator: node.combinator,
          left,
          right
        }));
    }

    throw new Error(`Function node ${node.id} requires runtime lowering before AST`);
  }

  private valueToAst(value: PredicateNode['value']): ASTNode {
    if (value.source === 'literal') {
      const literalValue = value.value;
      const dataType = literalValue === null ? 'null' : (typeof literalValue as 'string' | 'number' | 'boolean');

      return {
        type: 'Literal',
        value: literalValue,
        dataType
      };
    }

    if (value.source === 'field') {
      return {
        type: 'Identifier',
        name: value.fieldId
      };
    }

    return {
      type: 'CallExpression',
      callee: '__expr',
      arguments: [
        {
          type: 'Literal',
          value: value.expressionId,
          dataType: 'string'
        }
      ]
    };
  }

  private astToNode(node: ASTNode, nodes: Record<string, RuleNode>): string {
    if (node.type === 'LogicalExpression') {
      const groupId = this.newId('group');
      const leftId = this.astToNode(node.left, nodes);
      const rightId = this.astToNode(node.right, nodes);

      const group: GroupNode = {
        id: groupId,
        kind: 'group',
        combinator: node.operator,
        children: [leftId, rightId]
      };

      nodes[groupId] = group;
      return groupId;
    }

    if (node.type === 'BinaryExpression' && node.left.type === 'Identifier') {
      const predicateId = this.newId('predicate');
      const predicate: PredicateNode = {
        id: predicateId,
        kind: 'predicate',
        field: {
          id: node.left.name,
          valueType: 'unknown'
        },
        operator: node.operator,
        value: node.right.type === 'Identifier'
          ? { source: 'field', fieldId: node.right.name }
          : { source: 'literal', value: node.right.type === 'Literal' ? node.right.value : null }
      };

      nodes[predicateId] = predicate;
      return predicateId;
    }

    throw new Error(`Unsupported AST node in conversion: ${node.type}`);
  }

  private newId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
