import { ASTNode } from './types';

export type ActionType = 'SHOW_FIELD' | 'HIDE_FIELD' | 'SET_REQUIRED' | 'SET_VALUE' | 'SET_ERROR' | 'NAVIGATE';

export interface RuleEffect {
  action: ActionType;
  target: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

export interface RuleDefinition {
  id: string;
  description?: string;
  trigger?: string[];
  condition: ASTNode;
  onTrue?: RuleEffect[];
  onFalse?: RuleEffect[];
}
