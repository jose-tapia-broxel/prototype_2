export type FieldType = 'shortText' | 'longText' | 'number' | 'email' | 'dropdown' | 'checkbox' | 'password' | 'ssoLogin' | 'message' | 'container' | 'text' | 'textarea' | 'select' | 'carousel' | 'button' | 'effect' | 'imageDropzone' | 'drawing';

export type LocalizedString = string | Record<string, string>;

export interface FormField {
  id: string;
  type: FieldType;
  label: LocalizedString;
  required: boolean;
  options?: string[] | Record<string, string[]>; // For select/radio/dropdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any; // For plugins and custom fields
  placeholder?: LocalizedString;
  description?: LocalizedString;
  defaultValue?: string | boolean | number;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
}

export interface WorkflowAction {
  action: 'validateFields' | 'setVariable' | 'callService' | 'ssoLogin' | 'ifCondition' | 'navigateToStep' | 'showMessage' | 'delay';
  target?: string;
  message?: LocalizedString;
}

export interface WorkflowLifecycle {
  beforeRender?: WorkflowAction[];
  onRender?: WorkflowAction[];
  afterRender?: WorkflowAction[];
  beforeSubmit?: WorkflowAction[];
  onSubmit?: WorkflowAction[];
  onSuccess?: WorkflowAction[];
  onError?: WorkflowAction[];
}

export interface WorkflowNavigation {
  nextStep?: string | null;
}

export interface WorkflowValidationRule {
  fieldId: string;
  rule: string;
  errorMessage: LocalizedString;
}

export interface WorkflowStep {
  id: string;
  title: LocalizedString;
  layout?: FormField[]; // Support new layout property
  fields?: FormField[]; // Keep for backwards compatibility
  bindings?: Record<string, string>;
  validationRules?: WorkflowValidationRule[];
  lifecycle?: WorkflowLifecycle;
  navigation?: WorkflowNavigation;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  stateCode?: string; // Custom JS code for screen state
  onLoadingCode?: string;
  onInteractiveCode?: string;
  onCompleteCode?: string;
  onDestroyCode?: string;
  htmlCode?: string;  // Custom HTML for screen
  cssCode?: string;   // Custom CSS for screen
  jsCode?: string;    // Custom JS for screen
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  icon?: string;
  html: string;
  css: string;
  js: string;
}

export interface WorkflowDefinition {
  id: string;
  name?: LocalizedString;
  description: LocalizedString;
  category?: string;
  totalSteps?: number;
  successPath?: string;
  errorHandlingPath?: string;
  notes?: string;
  steps: WorkflowStep[];
  customToolbox?: CustomFieldDefinition[];
}

export interface FormSubmission {
  id: string;
  workflowId: string;
  data: Record<string, unknown>;
  submittedAt: string;
}
