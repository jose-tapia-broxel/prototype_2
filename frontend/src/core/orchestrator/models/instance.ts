export type InstanceStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'WAITING'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TokenWaitReason = 'FORM' | 'APPROVAL' | 'TIMER' | 'RETRY_BACKOFF';

export interface WorkflowToken {
  id: string;
  nodeId: string;
  status: 'ACTIVE' | 'WAITING' | 'COMPLETED' | 'FAILED';
  waitReason?: TokenWaitReason;
  resumeAt?: string;
  retryCount?: number;
  lastErrorCode?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionKey: string;
  status: InstanceStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>;
  tokens: WorkflowToken[];
  parentInstanceId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  history: InstanceHistoryEvent[];
}

export type HistoryEventType =
  | 'INSTANCE_STARTED'
  | 'NODE_ENTERED'
  | 'NODE_WAITING'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'TRANSITION_TAKEN'
  | 'RETRY_SCHEDULED'
  | 'TOKEN_CREATED'
  | 'TOKEN_CONSUMED'
  | 'CONTEXT_UPDATED'
  | 'INSTANCE_COMPLETED'
  | 'INSTANCE_FAILED';

export interface InstanceHistoryEvent {
  id: string;
  type: HistoryEventType;
  nodeId?: string;
  tokenId?: string;
  timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}
