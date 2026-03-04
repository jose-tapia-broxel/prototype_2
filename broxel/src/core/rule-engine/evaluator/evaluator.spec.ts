import { RuleEvaluator } from './evaluator';
import { ASTNode, ExecutionContext } from '../ast/types';

describe('RuleEvaluator', () => {
  let evaluator: RuleEvaluator;

  beforeEach(() => {
    evaluator = new RuleEvaluator();
  });

  it('should evaluate literals', () => {
    const node: ASTNode = { type: 'Literal', value: 42 };
    expect(evaluator.evaluate(node, { data: {} })).toBe(42);
  });

  it('should evaluate identifiers safely', () => {
    const context: ExecutionContext = {
      data: {
        user: { name: 'John', age: 30 }
      }
    };
    
    expect(evaluator.evaluate({ type: 'Identifier', name: 'user.name' }, context)).toBe('John');
    expect(evaluator.evaluate({ type: 'Identifier', name: 'user.age' }, context)).toBe(30);
    expect(evaluator.evaluate({ type: 'Identifier', name: 'user.missing' }, context)).toBeUndefined();
    
    // Security check
    expect(evaluator.evaluate({ type: 'Identifier', name: '__proto__' }, context)).toBeUndefined();
    expect(evaluator.evaluate({ type: 'Identifier', name: 'user.constructor' }, context)).toBeUndefined();
  });

  it('should evaluate binary expressions', () => {
    const context: ExecutionContext = { data: { a: 10, b: 5, c: 'test' } };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createBinary = (left: string, op: any, right: any): ASTNode => ({
      type: 'BinaryExpression',
      operator: op,
      left: { type: 'Identifier', name: left },
      right: { type: 'Literal', value: right }
    });

    expect(evaluator.evaluate(createBinary('a', '>', 5), context)).toBe(true);
    expect(evaluator.evaluate(createBinary('a', '<', 5), context)).toBe(false);
    expect(evaluator.evaluate(createBinary('a', '==', 10), context)).toBe(true);
    expect(evaluator.evaluate(createBinary('c', '!=', 'test2'), context)).toBe(true);
    expect(evaluator.evaluate(createBinary('a', 'IN', [5, 10, 15]), context)).toBe(true);
    expect(evaluator.evaluate(createBinary('b', 'IN', [1, 2, 3]), context)).toBe(false);
  });

  it('should evaluate logical expressions with short-circuiting', () => {
    const context: ExecutionContext = { data: { a: true, b: false } };
    
    const andNode: ASTNode = {
      type: 'LogicalExpression',
      operator: 'AND',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' }
    };
    expect(evaluator.evaluate(andNode, context)).toBe(false);

    const orNode: ASTNode = {
      type: 'LogicalExpression',
      operator: 'OR',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' }
    };
    expect(evaluator.evaluate(orNode, context)).toBe(true);
  });

  it('should evaluate function calls', () => {
    const context: ExecutionContext = {
      data: { age: 20 },
      functions: {
        isAdult: (age: number) => age >= 18,
        sum: (a: number, b: number) => a + b
      }
    };

    const callNode: ASTNode = {
      type: 'CallExpression',
      callee: 'isAdult',
      arguments: [{ type: 'Identifier', name: 'age' }]
    };
    expect(evaluator.evaluate(callNode, context)).toBe(true);

    const sumNode: ASTNode = {
      type: 'CallExpression',
      callee: 'sum',
      arguments: [
        { type: 'Literal', value: 10 },
        { type: 'Literal', value: 5 }
      ]
    };
    expect(evaluator.evaluate(sumNode, context)).toBe(15);

    const missingFnNode: ASTNode = {
      type: 'CallExpression',
      callee: 'missingFn',
      arguments: []
    };
    expect(() => evaluator.evaluate(missingFnNode, context)).toThrowError(/Function missingFn is not defined/);
  });
});
