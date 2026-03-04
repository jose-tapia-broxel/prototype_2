import { ASTNode } from '../../rule-engine/ast/types';

export type WorkflowNodeType = 
  | 'START' 
  | 'END' 
  | 'FORM_TASK'       // User input (UI)
  | 'HUMAN_TASK'      // Approval/Review by another user
  | 'SERVICE_TASK'    // Automated API call / Webhook
  | 'SCRIPT_TASK'     // Execute custom JS/Logic
  | 'EXCLUSIVE_GATEWAY' // XOR (If/Else routing)
  | 'PARALLEL_GATEWAY'  // AND (Fork/Join)
  | 'SUB_PROCESS';    // Reusable workflow

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;
  
  // For FORM_TASK: Reference to the UI layout/fields definition
  formDefinitionId?: string; 
  
  // For HUMAN_TASK: Who can claim/complete this?
  assignee?: string;
  candidateGroups?: string[];
  
  // For SERVICE_TASK / SCRIPT_TASK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionPayload?: Record<string, any>;
  
  // For SUB_PROCESS
  subProcessDefinitionId?: string;
}

export interface SequenceFlow {
  id: string;
  sourceRef: string; // ID of the source node
  targetRef: string; // ID of the target node
  
  // If leaving an EXCLUSIVE_GATEWAY, this condition must evaluate to true
  // Uses the Rule Engine AST we built in Phase 1
  condition?: ASTNode; 
  
  // Optional: Is this the default path if no other conditions match?
  isDefault?: boolean;
}

export type DefinitionStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

export interface WorkflowDefinition {
  id: string;
  workflowKey: string; // The stable identifier linking to WorkflowProject
  version: number;
  name: string;
  description?: string;
  
  nodes: WorkflowNode[];
  flows: SequenceFlow[];
  
  // Variables that must be provided when starting the workflow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema?: Record<string, any>; 
  
  status: DefinitionStatus;
  createdAt: string;
  createdBy: string;
}

export interface WorkflowProject {
  key: string; // PK
  name: string;
  description?: string;
  activeDefinitionId?: string; // Points to the currently active WorkflowDefinition
  
  // The mutable draft being edited in the builder
  draftPayload: {
    nodes: WorkflowNode[];
    flows: SequenceFlow[];
  };
  
  updatedAt: string;
}
