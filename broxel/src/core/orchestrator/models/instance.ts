export type InstanceStatus = 
  | 'CREATED'
  | 'RUNNING'
  | 'WAITING_FOR_ACTION' // Paused for Human Task or External Event
  | 'SUSPENDED'          // Manually paused
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface WorkflowToken {
  id: string;
  nodeId: string; // Where is this token currently sitting?
  status: 'ACTIVE' | 'WAITING' | 'COMPLETED' | 'FAILED';
  
  // For Parallel Gateways (Fork/Join)
  parentId?: string; // If this token was split from another
  
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string; // The specific versioned definition
  definitionKey: string; // The stable identifier (e.g., 'credit_approval')
  
  status: InstanceStatus;
  
  // The global state/data of the workflow
  // This is what the Rule Engine evaluates against
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>;
  
  // The active execution paths
  tokens: WorkflowToken[];
  
  // For Sub-Processes
  parentInstanceId?: string;
  
  // Optimistic Locking
  version: number;
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // Audit trail
  history: InstanceHistoryEvent[];
}

export type HistoryEventType = 
  | 'INSTANCE_STARTED'
  | 'NODE_ENTERED'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
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
  
  // What changed? (e.g., diff of the context, error message, user who completed a task)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}
