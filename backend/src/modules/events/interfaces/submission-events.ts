import { DomainEvent, createDomainEvent } from './domain-event.interface';

// ─────────────────────────────────────────────────────────────
// SUBMISSION EVENTS
// ─────────────────────────────────────────────────────────────

export const SUBMISSION_CREATED_EVENT = 'submission.created';
export const SUBMISSION_VALIDATED_EVENT = 'submission.validated';
export const SUBMISSION_PROCESSED_EVENT = 'submission.processed';
export const SUBMISSION_FAILED_EVENT = 'submission.failed';
export const SUBMISSION_REJECTED_EVENT = 'submission.rejected';

export interface SubmissionCreatedEvent extends DomainEvent {
  eventName: typeof SUBMISSION_CREATED_EVENT;
  eventCategory: 'submission';
  metadata: {
    submissionId: string;
    applicationId: string;
    workflowInstanceId?: string;
    formId?: string;
    nodeId?: string;
    fieldCount: number;
  };
}

export interface SubmissionValidatedEvent extends DomainEvent {
  eventName: typeof SUBMISSION_VALIDATED_EVENT;
  eventCategory: 'submission';
  metadata: {
    submissionId: string;
    applicationId: string;
    formId?: string;
    isValid: boolean;
    validationErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
}

export interface SubmissionProcessedEvent extends DomainEvent {
  eventName: typeof SUBMISSION_PROCESSED_EVENT;
  eventCategory: 'submission';
  metadata: {
    submissionId: string;
    applicationId: string;
    workflowInstanceId?: string;
    processingDurationMs: number;
    rulesEvaluated: number;
    actionsExecuted: number;
  };
}

export interface SubmissionFailedEvent extends DomainEvent {
  eventName: typeof SUBMISSION_FAILED_EVENT;
  eventCategory: 'error';
  metadata: {
    submissionId: string;
    applicationId: string;
    workflowInstanceId?: string;
    errorMessage: string;
    errorCode?: string;
    failedAtStage: 'validation' | 'processing' | 'rule_evaluation' | 'action_execution';
  };
}

export interface SubmissionRejectedEvent extends DomainEvent {
  eventName: typeof SUBMISSION_REJECTED_EVENT;
  eventCategory: 'submission';
  metadata: {
    submissionId: string;
    applicationId: string;
    workflowInstanceId?: string;
    rejectionReason: string;
    rejectedByRuleId?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────

export function createSubmissionCreatedEvent(
  organizationId: string,
  metadata: SubmissionCreatedEvent['metadata'],
  actorId?: string,
): SubmissionCreatedEvent {
  return createDomainEvent({
    eventName: SUBMISSION_CREATED_EVENT,
    eventCategory: 'submission',
    organizationId,
    actorId,
    entityType: 'submission',
    entityId: metadata.submissionId,
    metadata,
  }) as SubmissionCreatedEvent;
}

export function createSubmissionValidatedEvent(
  organizationId: string,
  metadata: SubmissionValidatedEvent['metadata'],
  actorId?: string,
): SubmissionValidatedEvent {
  return createDomainEvent({
    eventName: SUBMISSION_VALIDATED_EVENT,
    eventCategory: 'submission',
    organizationId,
    actorId,
    entityType: 'submission',
    entityId: metadata.submissionId,
    metadata,
  }) as SubmissionValidatedEvent;
}

export function createSubmissionProcessedEvent(
  organizationId: string,
  metadata: SubmissionProcessedEvent['metadata'],
  actorId?: string,
): SubmissionProcessedEvent {
  return createDomainEvent({
    eventName: SUBMISSION_PROCESSED_EVENT,
    eventCategory: 'submission',
    organizationId,
    actorId,
    entityType: 'submission',
    entityId: metadata.submissionId,
    metadata,
  }) as SubmissionProcessedEvent;
}

export function createSubmissionFailedEvent(
  organizationId: string,
  metadata: SubmissionFailedEvent['metadata'],
  actorId?: string,
): SubmissionFailedEvent {
  return createDomainEvent({
    eventName: SUBMISSION_FAILED_EVENT,
    eventCategory: 'error',
    organizationId,
    actorId,
    entityType: 'submission',
    entityId: metadata.submissionId,
    metadata,
  }) as SubmissionFailedEvent;
}

export function createSubmissionRejectedEvent(
  organizationId: string,
  metadata: SubmissionRejectedEvent['metadata'],
  actorId?: string,
): SubmissionRejectedEvent {
  return createDomainEvent({
    eventName: SUBMISSION_REJECTED_EVENT,
    eventCategory: 'submission',
    organizationId,
    actorId,
    entityType: 'submission',
    entityId: metadata.submissionId,
    metadata,
  }) as SubmissionRejectedEvent;
}
