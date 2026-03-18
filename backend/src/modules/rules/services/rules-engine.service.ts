import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rule } from '../entities/rule.entity';
import { DomainEventsService } from '../../events/services/domain-events.service';
import {
  RuleCondition,
  RuleAction,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleSetEvaluationResult,
  ActionExecutionResult,
  RuleExecutionResult,
  RuleDefinition,
  EvaluationTrace,
  ComparisonOperator,
  isFieldCondition,
  isLogicalCondition,
  FieldCondition,
  LogicalCondition,
  SetVariableActionParams,
  RejectActionParams,
  RouteActionParams,
} from '../interfaces/rule-types';

@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  constructor(
    @InjectRepository(Rule)
    private readonly rulesRepo: Repository<Rule>,
    private readonly events: DomainEventsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  /**
   * Evaluate a single condition against context
   */
  evaluate(condition: RuleCondition, context: RuleEvaluationContext): boolean {
    return this.evaluateCondition(condition, context, []);
  }

  /**
   * Evaluate a set of rules in priority order
   */
  async evaluateRuleSet(
    rules: RuleDefinition[],
    context: RuleEvaluationContext,
    options?: { collectTrace?: boolean },
  ): Promise<RuleSetEvaluationResult> {
    const startTime = Date.now();
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    const results: RuleEvaluationResult[] = [];
    const actionsToExecute: RuleAction[] = [];
    let stoppedEarly = false;

    for (const rule of sortedRules) {
      if (!rule.isActive) continue;

      const ruleStartTime = Date.now();
      const trace: EvaluationTrace[] = [];

      let matched = false;
      let error: string | undefined;

      try {
        matched = this.evaluateCondition(rule.condition, context, options?.collectTrace ? trace : []);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error evaluating rule ${rule.id}: ${error}`);
      }

      const result: RuleEvaluationResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        matched,
        condition: rule.condition,
        evaluatedAt: new Date(),
        executionTimeMs: Date.now() - ruleStartTime,
        actions: matched ? rule.actions : undefined,
        trace: options?.collectTrace ? trace : undefined,
        error,
      };

      results.push(result);

      if (matched && rule.actions) {
        actionsToExecute.push(...rule.actions);
      }

      // Emit event for each rule evaluation
      await this.emitRuleEvaluatedEvent(rule, matched, result.executionTimeMs, context);

      if (matched && rule.stopOnMatch) {
        stoppedEarly = true;
        break;
      }
    }

    const setResult: RuleSetEvaluationResult = {
      evaluatedAt: new Date(),
      totalRules: sortedRules.filter((r) => r.isActive).length,
      matchedRules: results.filter((r) => r.matched).length,
      results,
      actionsToExecute,
      stoppedEarly,
    };

    // Emit aggregate event
    await this.emitRuleSetEvaluatedEvent(setResult, context, Date.now() - startTime);

    return setResult;
  }

  /**
   * Evaluate rules and execute actions
   */
  async evaluateAndExecute(
    rules: RuleDefinition[],
    context: RuleEvaluationContext,
  ): Promise<RuleExecutionResult> {
    const ruleEvaluation = await this.evaluateRuleSet(rules, context);

    const actionResults: ActionExecutionResult[] = [];
    const contextUpdates: Record<string, unknown> = {};
    let routingDecision: string | undefined;
    let rejected: { reason: string; errorCode?: string } | undefined;

    for (const action of ruleEvaluation.actionsToExecute) {
      const result = await this.executeAction(action, context, contextUpdates);
      actionResults.push(result);

      if (result.success) {
        if (action.type === 'route') {
          routingDecision = (action.params as unknown as RouteActionParams).targetNodeId;
        } else if (action.type === 'reject') {
          const params = action.params as unknown as RejectActionParams;
          rejected = { reason: params.reason, errorCode: params.errorCode };
        } else if (action.type === 'setVariable') {
          const params = action.params as unknown as SetVariableActionParams;
          Object.assign(contextUpdates, { [params.variableName]: result.result });
        }
      }
    }

    return {
      ruleEvaluation,
      actionResults,
      contextUpdates,
      routingDecision,
      rejected,
    };
  }

  /**
   * Load and evaluate rules for an application
   */
  async evaluateApplicationRules(
    applicationId: string,
    organizationId: string,
    context: RuleEvaluationContext,
    ruleType?: 'condition' | 'validation' | 'calculation' | 'routing',
  ): Promise<RuleExecutionResult> {
    const whereClause: Record<string, unknown> = {
      applicationId,
      organizationId,
      isActive: true,
    };

    if (ruleType) {
      whereClause['ruleType'] = ruleType;
    }

    const rules = await this.rulesRepo.find({
      where: whereClause,
      order: { priority: 'DESC' },
    });

    const ruleDefinitions: RuleDefinition[] = rules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      ruleType: r.ruleType as RuleDefinition['ruleType'],
      condition: r.conditionJson as RuleCondition,
      actions: (Array.isArray(r.actionJson) ? r.actionJson : []) as RuleAction[],
      priority: r.priority,
      isActive: r.isActive,
      stopOnMatch: false,
    }));

    return this.evaluateAndExecute(ruleDefinitions, context);
  }

  // ─────────────────────────────────────────────────────────────
  // CONDITION EVALUATION (Recursive)
  // ─────────────────────────────────────────────────────────────

  private evaluateCondition(
    condition: RuleCondition,
    context: RuleEvaluationContext,
    trace: EvaluationTrace[],
    path = 'root',
  ): boolean {
    // Empty condition = always true
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    if (isLogicalCondition(condition)) {
      return this.evaluateLogicalCondition(condition, context, trace, path);
    }

    if (isFieldCondition(condition)) {
      return this.evaluateFieldCondition(condition, context, trace, path);
    }

    // Unknown condition format
    this.logger.warn(`Unknown condition format: ${JSON.stringify(condition)}`);
    return false;
  }

  private evaluateLogicalCondition(
    condition: LogicalCondition,
    context: RuleEvaluationContext,
    trace: EvaluationTrace[],
    path: string,
  ): boolean {
    // AND: All conditions must be true
    if (condition.and && Array.isArray(condition.and)) {
      const results = condition.and.map((c, i) =>
        this.evaluateCondition(c, context, trace, `${path}.and[${i}]`),
      );
      const result = results.every(Boolean);
      trace.push({ path: `${path}.and`, condition, result });
      return result;
    }

    // OR: At least one condition must be true
    if (condition.or && Array.isArray(condition.or)) {
      const results = condition.or.map((c, i) =>
        this.evaluateCondition(c, context, trace, `${path}.or[${i}]`),
      );
      const result = results.some(Boolean);
      trace.push({ path: `${path}.or`, condition, result });
      return result;
    }

    // NOT: Invert the result
    if (condition.not) {
      const result = !this.evaluateCondition(condition.not, context, trace, `${path}.not`);
      trace.push({ path: `${path}.not`, condition, result });
      return result;
    }

    return false;
  }

  private evaluateFieldCondition(
    condition: FieldCondition,
    context: RuleEvaluationContext,
    trace: EvaluationTrace[],
    path: string,
  ): boolean {
    const fieldValue = this.resolveFieldValue(condition.field, context);
    const result = this.compareValues(condition.operator, fieldValue, condition.value, condition.caseSensitive);

    trace.push({
      path,
      condition,
      result,
      fieldValue,
      expectedValue: condition.value,
    });

    return result;
  }

  private resolveFieldValue(fieldPath: string, context: RuleEvaluationContext): unknown {
    // Support dot notation: "submission.firstName", "workflowContext.approvalStatus"
    const parts = fieldPath.split('.');
    let value: unknown = this.buildFlatContext(context);

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  private buildFlatContext(context: RuleEvaluationContext): Record<string, unknown> {
    return {
      ...context.submission,
      ...context.workflowContext,
      ...context.variables,
      submission: context.submission,
      workflowContext: context.workflowContext,
      user: context.user,
      system: context.system,
      variables: context.variables,
    };
  }

  private compareValues(
    operator: ComparisonOperator,
    actual: unknown,
    expected: unknown,
    caseSensitive = true,
  ): boolean {
    const normalizeString = (val: unknown): string | unknown =>
      typeof val === 'string' && !caseSensitive ? val.toLowerCase() : val;

    const a = normalizeString(actual);
    const e = normalizeString(expected);

    switch (operator) {
      case 'eq':
        return a === e;

      case 'ne':
        return a !== e;

      case 'gt':
        return typeof a === 'number' && typeof e === 'number' && a > e;

      case 'gte':
        return typeof a === 'number' && typeof e === 'number' && a >= e;

      case 'lt':
        return typeof a === 'number' && typeof e === 'number' && a < e;

      case 'lte':
        return typeof a === 'number' && typeof e === 'number' && a <= e;

      case 'in':
        return Array.isArray(e) && e.some((item) => normalizeString(item) === a);

      case 'notIn':
        return !Array.isArray(e) || !e.some((item) => normalizeString(item) === a);

      case 'contains':
        return typeof a === 'string' && typeof e === 'string' && a.includes(e);

      case 'startsWith':
        return typeof a === 'string' && typeof e === 'string' && a.startsWith(e);

      case 'endsWith':
        return typeof a === 'string' && typeof e === 'string' && a.endsWith(e);

      case 'isNull':
        return actual === null || actual === undefined;

      case 'isNotNull':
        return actual !== null && actual !== undefined;

      case 'isEmpty':
        return this.isEmpty(actual);

      case 'isNotEmpty':
        return !this.isEmpty(actual);

      case 'regex':
        if (typeof a !== 'string' || typeof expected !== 'string') return false;
        try {
          const regex = new RegExp(expected, caseSensitive ? '' : 'i');
          return regex.test(a as string);
        } catch {
          return false;
        }

      case 'between':
        if (typeof a !== 'number' || !Array.isArray(e) || e.length !== 2) return false;
        return a >= e[0] && a <= e[1];

      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // ACTION EXECUTION
  // ─────────────────────────────────────────────────────────────

  private async executeAction(
    action: RuleAction,
    context: RuleEvaluationContext,
    contextUpdates: Record<string, unknown>,
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (action.type) {
        case 'setVariable':
          result = this.executeSetVariable(action.params as unknown as SetVariableActionParams, context, contextUpdates);
          break;

        case 'route':
          // Routing is handled by the caller - just validate params
          result = (action.params as unknown as RouteActionParams).targetNodeId;
          break;

        case 'reject':
          // Rejection is handled by the caller - just validate params
          result = action.params as unknown as RejectActionParams;
          break;

        case 'approve':
          result = { approved: true };
          break;

        case 'calculate':
          result = this.executeCalculation(action.params, context, contextUpdates);
          break;

        case 'transform':
          result = this.executeTransform(action.params, context);
          break;

        case 'sendNotification':
        case 'callWebhook':
        case 'assignTask':
          // These would integrate with external services
          this.logger.log(`Action ${action.type} would be executed: ${JSON.stringify(action.params)}`);
          result = { scheduled: true };
          break;

        case 'pauseWorkflow':
        case 'resumeWorkflow':
          result = { workflowAction: action.type };
          break;

        default:
          this.logger.warn(`Unknown action type: ${action.type}`);
          result = null;
      }

      return {
        action,
        success: true,
        executedAt: new Date(),
        result,
      };
    } catch (err) {
      return {
        action,
        success: false,
        executedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private executeSetVariable(
    params: SetVariableActionParams,
    context: RuleEvaluationContext,
    contextUpdates: Record<string, unknown>,
  ): unknown {
    const { variableName, value, operation = 'set' } = params;
    const currentValue = context.variables?.[variableName] ?? contextUpdates[variableName];

    let newValue: unknown;

    switch (operation) {
      case 'set':
        newValue = value;
        break;

      case 'append':
        if (Array.isArray(currentValue)) {
          newValue = [...currentValue, value];
        } else if (typeof currentValue === 'string' && typeof value === 'string') {
          newValue = currentValue + value;
        } else {
          newValue = value;
        }
        break;

      case 'increment':
        newValue = typeof currentValue === 'number' && typeof value === 'number' ? currentValue + value : value;
        break;

      case 'decrement':
        newValue = typeof currentValue === 'number' && typeof value === 'number' ? currentValue - value : value;
        break;

      default:
        newValue = value;
    }

    contextUpdates[variableName] = newValue;
    return newValue;
  }

  private executeCalculation(
    params: Record<string, unknown>,
    context: RuleEvaluationContext,
    contextUpdates: Record<string, unknown>,
  ): unknown {
    const { expression, targetVariable } = params as { expression: string; targetVariable: string };

    // Simple expression evaluation (basic math only)
    // In production, use a proper expression evaluator
    const flatContext = this.buildFlatContext(context);
    const mergedContext = { ...flatContext, ...contextUpdates };

    // Replace variable references with values
    let evaluatedExpression = expression;
    for (const [key, val] of Object.entries(mergedContext)) {
      if (typeof val === 'number' || typeof val === 'string') {
        evaluatedExpression = evaluatedExpression.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(val));
      }
    }

    // Evaluate simple math expressions (be careful with eval in production!)
    try {
      // Only allow numbers and basic operators
      if (/^[\d\s+\-*/().]+$/.test(evaluatedExpression)) {
        const result = Function(`"use strict"; return (${evaluatedExpression})`)();
        if (targetVariable) {
          contextUpdates[targetVariable] = result;
        }
        return result;
      }
    } catch {
      this.logger.warn(`Failed to evaluate expression: ${expression}`);
    }

    return null;
  }

  private executeTransform(params: Record<string, unknown>, context: RuleEvaluationContext): unknown {
    const { sourceField, targetField, transformation } = params as {
      sourceField: string;
      targetField: string;
      transformation: string;
    };

    const value = this.resolveFieldValue(sourceField, context);

    switch (transformation) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'toNumber':
        return Number(value);
      case 'toString':
        return String(value);
      case 'toBoolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT PUBLISHING
  // ─────────────────────────────────────────────────────────────

  private async emitRuleEvaluatedEvent(
    rule: RuleDefinition,
    matched: boolean,
    executionTimeMs: number,
    context: RuleEvaluationContext,
  ): Promise<void> {
    await this.events.emit('rule.evaluated', {
      organizationId: context.user?.organizationId,
      applicationId: context.system?.applicationId,
      workflowInstanceId: context.system?.workflowInstanceId,
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      executionTimeMs,
      actions: matched ? rule.actions : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  private async emitRuleSetEvaluatedEvent(
    result: RuleSetEvaluationResult,
    context: RuleEvaluationContext,
    totalExecutionTimeMs: number,
  ): Promise<void> {
    await this.events.emit('ruleset.evaluated', {
      organizationId: context.user?.organizationId,
      applicationId: context.system?.applicationId,
      workflowInstanceId: context.system?.workflowInstanceId,
      totalRules: result.totalRules,
      matchedRules: result.matchedRules,
      actionsExecuted: result.actionsToExecute.length,
      totalExecutionTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}
