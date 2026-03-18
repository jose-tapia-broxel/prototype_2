import { RuleEngine } from './engine';
import { RuleDefinition } from './ast/rule';
import { ExecutionContext } from './ast/types';

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  it('should evaluate rules and return effects', () => {
    const rules: RuleDefinition[] = [
      {
        id: 'rule_1',
        condition: {
          type: 'BinaryExpression',
          operator: '>=',
          left: { type: 'Identifier', name: 'age' },
          right: { type: 'Literal', value: 18 }
        },
        onTrue: [{ action: 'SHOW_FIELD', target: 'rfc' }],
        onFalse: [{ action: 'HIDE_FIELD', target: 'rfc' }]
      }
    ];

    engine.setRules(rules);

    const contextTrue: ExecutionContext = { data: { age: 20 } };
    const effectsTrue = engine.evaluateAll(contextTrue);
    expect(effectsTrue).toEqual([{ action: 'SHOW_FIELD', target: 'rfc' }]);

    const contextFalse: ExecutionContext = { data: { age: 15 } };
    const effectsFalse = engine.evaluateAll(contextFalse);
    expect(effectsFalse).toEqual([{ action: 'HIDE_FIELD', target: 'rfc' }]);
  });
});
