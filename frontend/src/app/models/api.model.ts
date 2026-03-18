/**
 * API Models aligned with backend schema
 * Phase 5: Frontend Core - Models aligned with backend
 */

// ============================================================================
// Organization & Application Models
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  organizationId: string;
  appKey: string;
  name: string;
  currentPublishedVersionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ApplicationVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ApplicationVersion {
  id: string;
  applicationId: string;
  organizationId: string;
  versionNumber: number;
  status: ApplicationVersionStatus;
  definitionJson: Record<string, unknown>;
  definitionHash: string;
  publishedAt?: string;
  createdBy: string;
  createdAt?: string;
}

// ============================================================================
// Workflow Models (aligned with backend entities)
// ============================================================================

export interface Workflow {
  id: string;
  applicationId: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkflowNodeType = 
  | 'start' 
  | 'end' 
  | 'form' 
  | 'screen' 
  | 'decision' 
  | 'action' 
  | 'wait' 
  | 'parallel' 
  | 'sub_workflow';

export interface WorkflowNode {
  id: string;
  workflowId: string;
  organizationId: string;
  nodeType: WorkflowNodeType;
  label: string;
  configJson: Record<string, unknown>;
  positionX: number;
  positionY: number;
  isStartNode: boolean;
  isEndNode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTransition {
  id: string;
  workflowId: string;
  organizationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionJson?: Record<string, unknown>;
  priority: number;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

// Full workflow with nodes and transitions
export interface WorkflowWithDetails extends Workflow {
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
}

// ============================================================================
// Workflow Instance Models (Runtime)
// ============================================================================

export type WorkflowInstanceStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface WorkflowInstance {
  id: string;
  organizationId: string;
  applicationId: string;
  applicationVersionId: string;
  workflowId: string;
  currentNodeId?: string;
  status: WorkflowInstanceStatus;
  contextJson: Record<string, unknown>;
  startedBy?: string;
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
  // Computed/joined fields
  workflowName?: string;
  applicationName?: string;
  currentNodeLabel?: string;
}

export interface WorkflowExecutionLog {
  id: string;
  instanceId: string;
  nodeId: string;
  action: string;
  previousStatus: WorkflowInstanceStatus;
  newStatus: WorkflowInstanceStatus;
  contextSnapshot: Record<string, unknown>;
  createdAt: string;
  createdBy?: string;
}

// ============================================================================
// Submission Models
// ============================================================================

export type SubmissionStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'rejected';

export interface Submission {
  id: string;
  organizationId: string;
  applicationId: string;
  workflowInstanceId?: string;
  formId?: string;
  nodeId?: string;
  submittedBy?: string;
  dataJson: Record<string, unknown>;
  status: SubmissionStatus;
  createdAt: string;
  processedAt?: string;
}

// ============================================================================
// Form Definition Models
// ============================================================================

export interface FormDefinition {
  id: string;
  applicationId: string;
  organizationId: string;
  name: string;
  schemaJson: FormSchema;
  createdAt: string;
  updatedAt: string;
}

export interface FormSchema {
  fields: FormFieldDefinition[];
  layout?: FormLayoutConfig;
  validation?: FormValidationConfig;
}

export interface FormFieldDefinition {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  options?: string[] | { label: string; value: string }[];
  validation?: FieldValidation;
  config?: Record<string, unknown>;
}

export interface FormLayoutConfig {
  columns?: number;
  spacing?: 'compact' | 'normal' | 'relaxed';
}

export interface FormValidationConfig {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showErrorsOnSubmit?: boolean;
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: string; // Custom validation function name
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface WorkflowInstanceFilters extends PaginationParams {
  status?: WorkflowInstanceStatus | WorkflowInstanceStatus[];
  workflowId?: string;
  applicationId?: string;
  startedAfter?: string;
  startedBefore?: string;
}

export interface SubmissionFilters extends PaginationParams {
  status?: SubmissionStatus | SubmissionStatus[];
  workflowInstanceId?: string;
  formId?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ApplicationFilters extends PaginationParams {
  search?: string;
}
