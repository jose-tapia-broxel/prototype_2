export type ExplainabilityQuestionType = 'missing_field' | 'rule_not_firing';

export interface ExplainabilityQuestion {
  type: ExplainabilityQuestionType;
  targetId: string;
}

export type EvidenceSource = 'dag' | 'ast' | 'telemetry';

export interface DependencyNodeEvidence {
  nodeId: string;
  nodeType: 'field' | 'rule' | 'derived';
  expression?: string;
  observedValue?: unknown;
  evaluation: 'true' | 'false' | 'not_executed';
  source: EvidenceSource;
}

export interface RootCause {
  code: string;
  confidence: number;
  plainText: string;
  technicalDetail: string;
  source: EvidenceSource;
}

export interface LogicalConflict {
  targetId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ExplainabilityResult {
  summary: string;
  why: string[];
  nextActions: string[];
  confidenceLabel: 'Alta' | 'Media' | 'Baja';
  dependencyChain: DependencyNodeEvidence[];
  rootCauses: RootCause[];
  conflicts: LogicalConflict[];
}
