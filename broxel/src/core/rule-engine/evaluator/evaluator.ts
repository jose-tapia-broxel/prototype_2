import { ASTNode, ExecutionContext } from '../ast/types';

export class RuleEvaluator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluate(node: ASTNode, context: ExecutionContext): any {
    if (!node) return null;

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return this.getSafeValue(context.data, node.name);

      case 'BinaryExpression': {
        const left = this.evaluate(node.left, context);
        const right = this.evaluate(node.right, context);
        
        switch (node.operator) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '>': return left > right;
          case '>=': return left >= right;
          case '<': return left < right;
          case '<=': return left <= right;
          case 'IN': 
            if (Array.isArray(right)) {
              return right.includes(left);
            }
            return false;
          default:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(`Unsupported binary operator: ${(node as any).operator}`);
        }
      }

      case 'LogicalExpression': {
        // Short-circuit evaluation
        if (node.operator === 'AND') {
          return this.evaluate(node.left, context) && this.evaluate(node.right, context);
        }
        if (node.operator === 'OR') {
          return this.evaluate(node.left, context) || this.evaluate(node.right, context);
        }
        throw new Error(`Unsupported logical operator: ${node.operator}`);
      }

      case 'CallExpression': {
        const fn = context.functions?.[node.callee];
        if (!fn) {
          throw new Error(`Function ${node.callee} is not defined in context`);
        }
        const args = node.arguments.map(arg => this.evaluate(arg, context));
        return fn(...args);
      }

      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(`Unsupported node type: ${(node as any).type}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getSafeValue(data: Record<string, any>, path: string): any {
    if (!data || typeof data !== 'object') return undefined;
    
    // Prevent access to prototype properties
    if (path === '__proto__' || path === 'constructor' || path === 'prototype') {
      return undefined;
    }

    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
