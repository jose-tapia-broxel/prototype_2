import { DomainEvent, createDomainEvent } from './domain-event.interface';

// ─────────────────────────────────────────────────────────────
// RULE EVENTS
// ─────────────────────────────────────────────────────────────

export const RULE_EVALUATED_EVENT = 'rule.evaluated';
export const RULE_ACTION_EXECUTED_EVENT = 'rule.action.executed';
export const RULE_EVALUATION_FAILED_EVENT = 'rule.evaluation.failed';

export interface RuleEvaluatedEvent extends DomainEvent {
  eventName: typeof RULE_EVALUATED_EVENT;
  eventCategory: 'rule';
  metadata: {
    ruleId: string;
    ruleName: string;
    ruleType: string;
    applicationId: string;
    workflowInstanceId?: string;
    submissionId?: string;
    conditionResult: boolean;
    evaluationDurationMs: number;
    inputContext?: Record<string, unknown>;
  };
}

export interface RuleActionExecutedEvent extends DomainEvent {
  eventName: typeof RULE_ACTION_EXECUTED_EVENT;
  eventCategory: 'rule';
  metadata: {
    ruleId: string;
    ruleName: string;
    applicationId: string;
    workflowInstanceId?: string;
    actionType: 'routing' | 'variable_assignment' | 'rejection' | 'notification' | 'custom';
    actionPayload?: Record<string, unknown>;
    executionDurationMs: number;
    success: boolean;
  };
}

export interface RuleEvaluationFailedEvent extends DomainEvent {
  eventName: typeof RULE_EVALUATION_FAILED_EVENT;
  eventCategory: 'error';
  metadata: {
    ruleId: string;
    ruleName: string;
    applicationId: string;
    workflowInstanceId?: string;
    errorMessage: string;
    errorCode?: string;
    inputContext?: Record<string, unknown>;
  };
}

// ─────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────

export function createRuleEvaluatedEvent(
  organizationId: string,
  metadata: RuleEvaluatedEvent['metadata'],
  actorId?: string,
): RuleEvaluatedEvent {
  return createDomainEvent({
    eventName: RULE_EVALUATED_EVENT,
    eventCategory: 'rule',
    organizationId,
    actorId,
    entityType: 'rule',
    entityId: metadata.ruleId,
    metadata,
  }) as RuleEvaluatedEvent;
}

export function createRuleActionExecutedEvent(
  organizationId: string,
  metadata: RuleActionExecutedEvent['metadata'],
  actorId?: string,
): RuleActionExecutedEvent {
  return createDomainEvent({
    eventName: RULE_ACTION_EXECUTED_EVENT,
    eventCategory: 'rule',
    organizationId,
    actorId,
    entityType: 'rule',
    entityId: metadata.ruleId,
    metadata,
  }) as RuleActionExecutedEvent;
}

export function createRuleEvaluationFailedEvent(
  organizationId: string,
  metadata: RuleEvaluationFailedEvent['metadata'],
  actorId?: string,
): RuleEvaluationFailedEvent {
  return createDomainEvent({
    eventName: RULE_EVALUATION_FAILED_EVENT,
    eventCategory: 'error',
    organizationId,
    actorId,
    entityType: 'rule',
    entityId: metadata.ruleId,
    metadata,
  }) as RuleEvaluationFailedEvent;
}
