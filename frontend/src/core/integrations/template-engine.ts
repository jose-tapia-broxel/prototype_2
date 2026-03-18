import { ExecutionContext } from '../rule-engine/ast/types';

export class TemplateEngine {
  /**
   * Evaluates a template string like "Hello {{context.user.name}}" against the context.
   * Supports basic dot notation.
   */
  static renderString(template: string, context: ExecutionContext): string {
    if (!template || typeof template !== 'string') return template;

    // Matches {{ path.to.variable }}
    const regex = /\{\{\s*([\w.]+)\s*\}\}/g;

    return template.replace(regex, (match, path) => {
      const value = this.resolvePath(path, context);
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Recursively evaluates an object or array, rendering all string templates within it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static renderObject(obj: any, context: ExecutionContext): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.renderString(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.renderObject(item, context));
    }

    if (typeof obj === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.renderObject(obj[key], context);
        }
      }
      return result;
    }

    // Numbers, booleans, etc.
    return obj;
  }

  /**
   * Safely resolves a dot-notation path (e.g., "context.user.name") against the context.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static resolvePath(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    
    // The root of our path is usually 'context' or 'env'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = context;

    // If the path starts with 'context', we map it to context.data
    if (parts[0] === 'context') {
      current = context.data;
      parts.shift(); // Remove 'context'
    } else if (parts[0] === 'env') {
      // In a real system, you'd inject environment variables here securely
      current = process.env || {};
      parts.shift();
    }

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
