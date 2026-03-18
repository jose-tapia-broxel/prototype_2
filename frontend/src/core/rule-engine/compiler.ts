import { ASTNode, ExecutionContext } from './ast/types';

export class RuleCompiler {
  /**
   * Compiles an AST into a native JavaScript function.
   * The returned function accepts an ExecutionContext and returns the evaluated result.
   * This provides a 100x-1000x performance boost over recursive AST interpretation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static compile(node: ASTNode): (context: ExecutionContext) => any {
    const jsCode = this.generateCode(node);
    
    // We wrap the execution in a try-catch to handle potential runtime errors safely
    const fnBody = `
      try {
        const data = context.data || {};
        const fns = context.functions || {};
        return ${jsCode};
      } catch (e) {
        console.error('Rule execution error:', e);
        return false;
      }
    `;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Function('context', fnBody) as (context: ExecutionContext) => any;
  }

  private static generateCode(node: ASTNode): string {
    switch (node.type) {
      case 'Literal':
        if (typeof node.value === 'string') {
          // Escape quotes
          return `'${node.value.replace(/'/g, "\\'")}'`;
        }
        if (node.value === null) return 'null';
        if (node.value === undefined) return 'undefined';
        return String(node.value);

      case 'Identifier':
        // We resolve identifiers against context.data
        return this.generateIdentifierCode(node.name);

      case 'BinaryExpression': {
        const left = this.generateCode(node.left);
        const right = this.generateCode(node.right);
        
        if (node.operator === 'IN') {
          return `(Array.isArray(${right}) ? ${right}.includes(${left}) : false)`;
        }
        
        // Map AST operators to JS operators
        const opMap: Record<string, string> = {
          '==': '===',
          '!=': '!==',
          '>': '>',
          '>=': '>=',
          '<': '<',
          '<=': '<='
        };
        const jsOp = opMap[node.operator] || '===';
        return `(${left} ${jsOp} ${right})`;
      }

      case 'LogicalExpression': {
        const left = this.generateCode(node.left);
        const right = this.generateCode(node.right);
        const jsOp = node.operator === 'AND' ? '&&' : '||';
        return `(${left} ${jsOp} ${right})`;
      }

      case 'CallExpression': {
        const args = node.arguments.map(arg => this.generateCode(arg)).join(', ');
        return `(fns['${node.callee}'] ? fns['${node.callee}'](${args}) : null)`;
      }

      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(`Unsupported node type: ${(node as any).type}`);
    }
  }

  private static generateIdentifierCode(name: string): string {
    // If name has dots (e.g., "user.age"), we generate safe access: data?.['user']?.['age']
    const parts = name.split('.');
    if (parts.length === 1) {
      return `data['${name}']`;
    }
    return `data` + parts.map(p => `?.['${p}']`).join('');
  }
}
