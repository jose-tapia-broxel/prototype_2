import { Injectable } from '@angular/core';

export interface GeneratedIntentAmbiguity {
  question: string;
}

export interface GeneratedIntent {
  ambiguities: GeneratedIntentAmbiguity[];
}

export interface GeneratedWorkflowField {
  id: string;
  type: string;
  label: string;
  required: boolean;
}

export interface GeneratedWorkflowStep {
  id: string;
  title: string;
  fields: GeneratedWorkflowField[];
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  stateCode?: string;
  onLoadingCode?: string;
  onInteractiveCode?: string;
  onCompleteCode?: string;
  onDestroyCode?: string;
  htmlCode?: string;
  cssCode?: string;
}

export interface GeneratedWorkflowPayload {
  name?: string;
  description?: string;
  category?: string;
  steps: GeneratedWorkflowStep[];
}

export interface GeneratedWorkflowResult {
  workflow: GeneratedWorkflowPayload;
  intent: GeneratedIntent;
}

@Injectable({
  providedIn: 'root'
})
export class NaturalLanguageWorkflowService {
  generateFromText(prompt: string): GeneratedWorkflowResult {
    const normalizedPrompt = prompt.trim();
    const fallbackName = normalizedPrompt ? `Workflow: ${normalizedPrompt.slice(0, 40)}` : 'Generated Workflow';

    return {
      workflow: {
        name: fallbackName,
        description: normalizedPrompt || 'Generated from text prompt.',
        category: 'AI Generated',
        steps: [
          {
            id: 'step_1',
            title: 'Initial Step',
            fields: [
              {
                id: 'input_1',
                type: 'shortText',
                label: 'Input',
                required: true
              }
            ],
            position: { x: 120, y: 120 },
            dimensions: { width: 360, height: 650 }
          }
        ]
      },
      intent: {
        ambiguities: []
      }
    };
  }
}
