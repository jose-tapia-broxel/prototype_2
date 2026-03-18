import { DomainEvent, EventCategory, createDomainEvent } from './domain-event.interface';

// ─────────────────────────────────────────────────────────────
// WORKFLOW EVENTS
// ─────────────────────────────────────────────────────────────

export const WORKFLOW_STARTED_EVENT = 'workflow.started';
export const WORKFLOW_COMPLETED_EVENT = 'workflow.completed';
export const WORKFLOW_FAILED_EVENT = 'workflow.failed';
export const WORKFLOW_PAUSED_EVENT = 'workflow.paused';
export const WORKFLOW_RESUMED_EVENT = 'workflow.resumed';
export const WORKFLOW_CANCELLED_EVENT = 'workflow.cancelled';
export const WORKFLOW_NODE_ENTERED_EVENT = 'workflow.node.entered';
export const WORKFLOW_NODE_EXITED_EVENT = 'workflow.node.exited';
export const WORKFLOW_TRANSITION_EVENT = 'workflow.transition';

export interface WorkflowStartedEvent extends DomainEvent {
  eventName: typeof WORKFLOW_STARTED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    applicationId: string;
    applicationVersionId: string;
    startNodeId?: string;
    initialContext?: Record<string, unknown>;
  };
}

export interface WorkflowCompletedEvent extends DomainEvent {
  eventName: typeof WORKFLOW_COMPLETED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    applicationId: string;
    finalNodeId?: string;
    durationMs: number;
    finalContext?: Record<string, unknown>;
  };
}

export interface WorkflowFailedEvent extends DomainEvent {
  eventName: typeof WORKFLOW_FAILED_EVENT;
  eventCategory: 'error';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    applicationId: string;
    failedNodeId?: string;
    errorMessage: string;
    errorCode?: string;
    durationMs?: number;
  };
}

export interface WorkflowPausedEvent extends DomainEvent {
  eventName: typeof WORKFLOW_PAUSED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    pausedAtNodeId?: string;
    reason?: string;
  };
}

export interface WorkflowResumedEvent extends DomainEvent {
  eventName: typeof WORKFLOW_RESUMED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    resumedAtNodeId?: string;
  };
}

export interface WorkflowCancelledEvent extends DomainEvent {
  eventName: typeof WORKFLOW_CANCELLED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    cancelledAtNodeId?: string;
    reason?: string;
    durationMs?: number;
  };
}

export interface WorkflowNodeEnteredEvent extends DomainEvent {
  eventName: typeof WORKFLOW_NODE_ENTERED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    previousNodeId?: string;
  };
}

export interface WorkflowNodeExitedEvent extends DomainEvent {
  eventName: typeof WORKFLOW_NODE_EXITED_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    nodeId: string;
    nodeType: string;
    durationMs: number;
    outcome?: 'success' | 'error' | 'skipped';
  };
}

export interface WorkflowTransitionEvent extends DomainEvent {
  eventName: typeof WORKFLOW_TRANSITION_EVENT;
  eventCategory: 'workflow';
  metadata: {
    workflowInstanceId: string;
    workflowId: string;
    transitionId: string;
    sourceNodeId: string;
    targetNodeId: string;
    conditionMet?: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────

export function createWorkflowStartedEvent(
  organizationId: string,
  metadata: WorkflowStartedEvent['metadata'],
  actorId?: string,
): WorkflowStartedEvent {
  return createDomainEvent({
    eventName: WORKFLOW_STARTED_EVENT,
    eventCategory: 'workflow',
    organizationId,
    actorId,
    entityType: 'workflow_instance',
    entityId: metadata.workflowInstanceId,
    metadata,
  }) as WorkflowStartedEvent;
}

export function createWorkflowCompletedEvent(
  organizationId: string,
  metadata: WorkflowCompletedEvent['metadata'],
  actorId?: string,
): WorkflowCompletedEvent {
  return createDomainEvent({
    eventName: WORKFLOW_COMPLETED_EVENT,
    eventCategory: 'workflow',
    organizationId,
    actorId,
    entityType: 'workflow_instance',
    entityId: metadata.workflowInstanceId,
    metadata,
  }) as WorkflowCompletedEvent;
}

export function createWorkflowFailedEvent(
  organizationId: string,
  metadata: WorkflowFailedEvent['metadata'],
  actorId?: string,
): WorkflowFailedEvent {
  return createDomainEvent({
    eventName: WORKFLOW_FAILED_EVENT,
    eventCategory: 'error',
    organizationId,
    actorId,
    entityType: 'workflow_instance',
    entityId: metadata.workflowInstanceId,
    metadata,
  }) as WorkflowFailedEvent;
}

export function createWorkflowNodeEnteredEvent(
  organizationId: string,
  metadata: WorkflowNodeEnteredEvent['metadata'],
  actorId?: string,
): WorkflowNodeEnteredEvent {
  return createDomainEvent({
    eventName: WORKFLOW_NODE_ENTERED_EVENT,
    eventCategory: 'workflow',
    organizationId,
    actorId,
    entityType: 'workflow_node',
    entityId: metadata.nodeId,
    metadata,
  }) as WorkflowNodeEnteredEvent;
}

export function createWorkflowTransitionEvent(
  organizationId: string,
  metadata: WorkflowTransitionEvent['metadata'],
  actorId?: string,
): WorkflowTransitionEvent {
  return createDomainEvent({
    eventName: WORKFLOW_TRANSITION_EVENT,
    eventCategory: 'workflow',
    organizationId,
    actorId,
    entityType: 'workflow_transition',
    entityId: metadata.transitionId,
    metadata,
  }) as WorkflowTransitionEvent;
}
