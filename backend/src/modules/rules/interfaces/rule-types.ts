/**
 * Rule Engine Types
 * Defines the structure for rule conditions, actions, and evaluation context
 */

// ─────────────────────────────────────────────────────────────
// RULE CONDITION TYPES
// ─────────────────────────────────────────────────────────────

export type ComparisonOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith'
  | 'isNull' | 'isNotNull' | 'isEmpty' | 'isNotEmpty'
  | 'regex' | 'between';

export interface FieldCondition {
  field: string;
  operator: ComparisonOperator;
  value?: unknown;
  caseSensitive?: boolean;
}

export interface LogicalCondition {
  and?: RuleCondition[];
  or?: RuleCondition[];
  not?: RuleCondition;
}

export type RuleCondition = FieldCondition | LogicalCondition;

// Type guard for field condition
export function isFieldCondition(condition: RuleCondition): condition is FieldCondition {
  return 'field' in condition && 'operator' in condition;
}

// Type guard for logical condition
export function isLogicalCondition(condition: RuleCondition): condition is LogicalCondition {
  return 'and' in condition || 'or' in condition || 'not' in condition;
}

// ─────────────────────────────────────────────────────────────
// RULE ACTION TYPES
// ─────────────────────────────────────────────────────────────

export type RuleActionType =
  | 'route'           // Route to specific node
  | 'setVariable'     // Set context variable
  | 'reject'          // Reject submission/workflow
  | 'approve'         // Approve/complete workflow
  | 'sendNotification' // Trigger notification
  | 'callWebhook'     // Call external webhook
  | 'assignTask'      // Assign task to user/group
  | 'calculate'       // Perform calculation
  | 'transform'       // Transform data
  | 'pauseWorkflow'   // Pause workflow execution
  | 'resumeWorkflow'; // Resume workflow execution

export interface RuleAction {
  type: RuleActionType;
  params: Record<string, unknown>;
}

export interface RouteActionParams {
  targetNodeId: string;
  reason?: string;
}

export interface SetVariableActionParams {
  variableName: string;
  value: unknown;
  operation?: 'set' | 'append' | 'increment' | 'decrement';
}

export interface RejectActionParams {
  reason: string;
  errorCode?: string;
}

export interface SendNotificationActionParams {
  templateId?: string;
  recipients: string[];
  channel: 'email' | 'sms' | 'push' | 'webhook';
  data?: Record<string, unknown>;
}

export interface AssignTaskActionParams {
  userId?: string;
  groupId?: string;
  taskTitle: string;
  dueInHours?: number;
}

// ─────────────────────────────────────────────────────────────
// RULE DEFINITION
// ─────────────────────────────────────────────────────────────

export interface RuleDefinition {
  id: string;
  name: string;
  description?: string;
  ruleType: 'condition' | 'validation' | 'calculation' | 'routing';
  condition: RuleCondition;
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
  stopOnMatch?: boolean; // If true, don't evaluate subsequent rules after this one matches
}

// ─────────────────────────────────────────────────────────────
// EVALUATION CONTEXT
// ─────────────────────────────────────────────────────────────

export interface RuleEvaluationContext {
  /** Submission data */
  submission?: Record<string, unknown>;
  /** Workflow instance context */
  workflowContext?: Record<string, unknown>;
  /** Current user information */
  user?: {
    id: string;
    email?: string;
    role?: string;
    organizationId?: string;
  };
  /** System variables */
  system?: {
    currentDate: string;
    currentTimestamp: number;
    workflowInstanceId?: string;
    currentNodeId?: string;
    applicationId?: string;
  };
  /** Custom variables */
  variables?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// EVALUATION RESULT
// ─────────────────────────────────────────────────────────────

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  condition: RuleCondition;
  evaluatedAt: Date;
  executionTimeMs: number;
  /** Actions to execute if matched */
  actions?: RuleAction[];
  /** Detailed evaluation trace for debugging */
  trace?: EvaluationTrace[];
  /** Error if evaluation failed */
  error?: string;
}

export interface EvaluationTrace {
  path: string;
  condition: RuleCondition;
  result: boolean;
  fieldValue?: unknown;
  expectedValue?: unknown;
}

export interface RuleSetEvaluationResult {
  evaluatedAt: Date;
  totalRules: number;
  matchedRules: number;
  results: RuleEvaluationResult[];
  /** Aggregated actions from all matched rules */
  actionsToExecute: RuleAction[];
  /** Whether processing was stopped early due to stopOnMatch */
  stoppedEarly: boolean;
}

// ─────────────────────────────────────────────────────────────
// ACTION EXECUTION RESULT
// ─────────────────────────────────────────────────────────────

export interface ActionExecutionResult {
  action: RuleAction;
  success: boolean;
  executedAt: Date;
  result?: unknown;
  error?: string;
}

export interface RuleExecutionResult {
  ruleEvaluation: RuleSetEvaluationResult;
  actionResults: ActionExecutionResult[];
  contextUpdates: Record<string, unknown>;
  routingDecision?: string; // Target node ID if routing action was executed
  rejected?: {
    reason: string;
    errorCode?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// RULE EVENTS
// ─────────────────────────────────────────────────────────────

export interface RuleEvaluatedEventPayload {
  organizationId: string;
  applicationId: string;
  workflowInstanceId?: string;
  submissionId?: string;
  ruleId: string;
  ruleName: string;
  matched: boolean;
  executionTimeMs: number;
  actions?: RuleAction[];
  timestamp: string;
}

export interface RuleSetEvaluatedEventPayload {
  organizationId: string;
  applicationId: string;
  workflowInstanceId?: string;
  submissionId?: string;
  totalRules: number;
  matchedRules: number;
  actionsExecuted: number;
  totalExecutionTimeMs: number;
  timestamp: string;
}
