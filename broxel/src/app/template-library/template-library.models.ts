import { WorkflowDefinition } from '../models/workflow.model';

export interface TemplateFieldOption {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  required?: boolean;
  helpText?: string;
  defaultValue?: string | number;
  options?: string[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  outcome: string;
  problem: string;
  useWhen: string;
  avoidWhen: string;
  setupMinutes: number;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  requirements: string[];
  variables: TemplateFieldOption[];
  addOns: string[];
  benchmark: string;
  optimizationTip: string;
  kpis: string[];
  createWorkflow(config: Record<string, string | number>): Partial<WorkflowDefinition>;
}
