import { Injectable, signal, computed, WritableSignal, Signal } from '@angular/core';
import { RuleCompiler } from './compiler';
import { ASTNode, ExecutionContext } from './ast/types';

@Injectable({
  providedIn: 'root'
})
export class ReactiveWorkflowEngine {
  // Map of fieldId -> WritableSignal holding the field's value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fieldSignals = new Map<string, WritableSignal<any>>();
  
  // Map of ruleId -> Compiled Signal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ruleSignals = new Map<string, Signal<any>>();

  // Global functions available to rules
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private functions: Record<string, (...args: any[]) => any> = {
    SUM: (...args) => args.reduce((a, b) => Number(a) + Number(b), 0),
    CONTAINS: (str, val) => String(str).includes(String(val))
  };

  /**
   * Updates a field's value. This will automatically trigger re-evaluation
   * ONLY for rules that depend on this field.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFieldValue(fieldId: string, value: any) {
    if (!this.fieldSignals.has(fieldId)) {
      this.fieldSignals.set(fieldId, signal(value));
    } else {
      this.fieldSignals.get(fieldId)!.set(value);
    }
  }

  /**
   * Gets or creates a signal for a field.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFieldSignal(fieldId: string): WritableSignal<any> {
    if (!this.fieldSignals.has(fieldId)) {
      this.fieldSignals.set(fieldId, signal(null));
    }
    return this.fieldSignals.get(fieldId)!;
  }

  /**
   * Registers a rule AST and returns a computed signal that represents its live result.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerRule(ruleId: string, ast: ASTNode): Signal<any> {
    if (this.ruleSignals.has(ruleId)) {
      return this.ruleSignals.get(ruleId)!;
    }

    // 1. Compile AST to native JS function
    const compiledFn = RuleCompiler.compile(ast);

    // 2. Create a Proxy to intercept field reads during execution
    // This is the magic: when the compiled function reads `context.data['age']`,
    // the proxy intercepts it, calls `this.getFieldSignal('age')()`, which registers
    // the Angular Signal dependency automatically!
    const dataProxy = new Proxy({}, {
      get: (target, prop: string) => {
        return this.getFieldSignal(prop)(); // READS THE SIGNAL
      }
    });

    const executionContext: ExecutionContext = {
      data: dataProxy,
      functions: this.functions
    };

    // 3. Wrap in a computed signal
    const ruleSignal = computed(() => {
      return compiledFn(executionContext);
    });

    this.ruleSignals.set(ruleId, ruleSignal);
    return ruleSignal;
  }

  /**
   * Cleans up all signals (useful when switching steps/workflows)
   */
  reset() {
    this.fieldSignals.clear();
    this.ruleSignals.clear();
  }
}
