import { ASTNode } from '../../rule-engine/ast/types';

export type WorkflowNodeType =
  | 'START'
  | 'FORM'
  | 'API_CALL'
  | 'CONDITION'
  | 'APPROVAL'
  | 'TIMER'
  | 'END';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;

  // For FORM
  formDefinitionId?: string;

  // For APPROVAL
  assignee?: string;
  candidateGroups?: string[];

  // For API_CALL
  integrationKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionPayload?: Record<string, any>;

  // For TIMER
  timerMs?: number;
}

export interface SequenceFlow {
  id: string;
  sourceRef: string;
  targetRef: string;

  // If leaving a CONDITION node, this condition must evaluate to true
  condition?: ASTNode;
  isDefault?: boolean;
  priority?: number;
}

export type DefinitionStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

export interface WorkflowDefinition {
  id: string;
  workflowKey: string;
  version: number;
  name: string;
  description?: string;

  nodes: WorkflowNode[];
  flows: SequenceFlow[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema?: Record<string, any>;

  status: DefinitionStatus;
  createdAt: string;
  createdBy: string;
}

export interface WorkflowProject {
  key: string;
  name: string;
  description?: string;
  activeDefinitionId?: string;
  draftPayload: {
    nodes: WorkflowNode[];
    flows: SequenceFlow[];
  };
  updatedAt: string;
}
