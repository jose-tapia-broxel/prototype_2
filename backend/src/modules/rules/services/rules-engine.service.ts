import { Injectable } from '@nestjs/common';

@Injectable()
export class RulesEngineService {
  evaluate(expression: Record<string, unknown>, context: Record<string, unknown>): boolean {
    if (Object.keys(expression).length === 0) {
      return true;
    }

    const key = expression['field'];
    const expected = expression['equals'];
    if (typeof key === 'string') {
      return context[key] === expected;
    }

    return false;
  }
}
