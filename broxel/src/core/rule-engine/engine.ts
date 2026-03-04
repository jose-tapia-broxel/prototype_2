import { RuleEvaluator } from './evaluator/evaluator';
import { RuleDefinition, RuleEffect } from './ast/rule';
import { ExecutionContext } from './ast/types';

export class RuleEngine {
  private evaluator: RuleEvaluator;
  private rules: RuleDefinition[] = [];

  constructor() {
    this.evaluator = new RuleEvaluator();
  }

  setRules(rules: RuleDefinition[]) {
    this.rules = rules;
  }

  evaluateAll(context: ExecutionContext): RuleEffect[] {
    const effects: RuleEffect[] = [];

    for (const rule of this.rules) {
      const result = this.evaluator.evaluate(rule.condition, context);
      
      if (result) {
        if (rule.onTrue) {
          effects.push(...rule.onTrue);
        }
      } else {
        if (rule.onFalse) {
          effects.push(...rule.onFalse);
        }
      }
    }

    return effects;
  }
}
