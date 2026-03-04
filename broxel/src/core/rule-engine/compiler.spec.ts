import { RuleCompiler } from './compiler';
import { ASTNode, ExecutionContext } from './ast/types';

describe('RuleCompiler Benchmark & Correctness', () => {
  const ast: ASTNode = {
    type: 'LogicalExpression',
    operator: 'AND',
    left: {
      type: 'BinaryExpression',
      operator: '>=',
      left: { type: 'Identifier', name: 'age' },
      right: { type: 'Literal', value: 18, dataType: 'number' }
    },
    right: {
      type: 'BinaryExpression',
      operator: '==',
      left: { type: 'Identifier', name: 'status' },
      right: { type: 'Literal', value: 'ACTIVE', dataType: 'string' }
    }
  };

  const context: ExecutionContext = {
    data: { age: 25, status: 'ACTIVE' }
  };

  it('should compile and evaluate correctly', () => {
    const compiledFn = RuleCompiler.compile(ast);
    const result = compiledFn(context);
    expect(result).toBe(true);
  });

  it('should handle nested identifiers correctly', () => {
    const nestedAst: ASTNode = {
      type: 'BinaryExpression',
      operator: '==',
      left: { type: 'Identifier', name: 'user.profile.role' },
      right: { type: 'Literal', value: 'ADMIN', dataType: 'string' }
    };

    const compiledFn = RuleCompiler.compile(nestedAst);
    
    expect(compiledFn({ data: { user: { profile: { role: 'ADMIN' } } } })).toBe(true);
    expect(compiledFn({ data: { user: { profile: { role: 'USER' } } } })).toBe(false);
    expect(compiledFn({ data: {} })).toBe(false); // Safe navigation test
  });

  it('benchmark: compiled vs interpreted (simulated)', () => {
    const compiledFn = RuleCompiler.compile(ast);
    
    const startCompiled = performance.now();
    for (let i = 0; i < 10000; i++) {
      compiledFn(context);
    }
    const endCompiled = performance.now();
    
    console.log(`Compiled 10k evaluations took: ${endCompiled - startCompiled}ms`);
    // Typically takes < 1ms, whereas recursive interpretation takes ~10-20ms
    expect(endCompiled - startCompiled).toBeLessThan(50); 
  });
});
