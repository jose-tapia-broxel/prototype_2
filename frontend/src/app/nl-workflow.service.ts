import { Injectable } from '@angular/core';
import { WorkflowDefinition, WorkflowStep, FormField } from './models/workflow.model';

export interface IntentAmbiguity {
  question: string;
  confidence: number;
}

export interface IntermediateIntentModel {
  sourceText: string;
  workflowName: string;
  fields: Array<{ id: string; label: string; type: 'number' | 'email' | 'text'; required: boolean; min?: number; max?: number }>;
  steps: Array<{ id: string; title: string; kind: 'form' | 'decision' | 'approval' | 'end' | 'integration' }>;
  routes: Array<{ from: string; to: string; when?: string }>;
  integrations?: Array<{ id: string; type: string; label: string; requiresConfig: boolean }>;
  ambiguities: IntentAmbiguity[];
}

export interface WorkflowGenerationResult {
  intent: IntermediateIntentModel;
  workflow: Partial<WorkflowDefinition>;
}

@Injectable({ providedIn: 'root' })
export class NaturalLanguageWorkflowService {
  
  // Integration detection patterns
  private readonly integrationPatterns = [
    { keywords: ['api', 'llamar', 'consultar', 'fetch', 'rest', 'endpoint'], type: 'api_call', label: 'Llamada API' },
    { keywords: ['firebase', 'firestore', 'guardar', 'almacenar en firebase'], type: 'firebase_action', label: 'Acción Firebase' },
    { keywords: ['cache', 'cachear', 'almacenar temporalmente', 'guardar temporalmente'], type: 'cache_operation', label: 'Operación de caché' },
    { keywords: ['cdn', 'subir archivo', 'upload', 'subir imagen', 'cloud storage'], type: 'cdn_upload', label: 'Subir a CDN' },
    { keywords: ['transformar', 'mapear', 'convert', 'transform data'], type: 'transformation', label: 'Transformar datos' },
    { keywords: ['webhook', 'callback', 'notificar', 'notify external'], type: 'webhook_listener', label: 'Webhook' },
  ];

  interpret(text: string): IntermediateIntentModel {
    const normalized = text.trim().toLowerCase();
    const hasRegistration = /registro|registration|registración/.test(normalized);
    const hasAge = /edad|age/.test(normalized);
    const minorThreshold = this.extractMinorThreshold(normalized) ?? 18;
    const requiresApprovalForMinor = /aprobaci[oó]n|approval/.test(normalized) && /menor|minor|<\s*\d+/.test(normalized);

    const fields: IntermediateIntentModel['fields'] = [];

    if (hasAge) {
      fields.push({
        id: 'edad',
        label: 'Edad',
        type: 'number',
        required: true,
        min: 0,
        max: 120
      });
    }

    if (/email|correo/.test(normalized)) {
      fields.push({ id: 'email', label: 'Correo electrónico', type: 'email', required: true });
    }

    if (fields.length === 0) {
      fields.push({ id: 'nombre', label: 'Nombre', type: 'text', required: true });
    }

    const steps: IntermediateIntentModel['steps'] = [
      { id: 'form_registro', title: hasRegistration ? 'Formulario de registro' : 'Formulario', kind: 'form' }
    ];

    const routes: IntermediateIntentModel['routes'] = [];

    if (hasAge) {
      steps.push({ id: 'decision_edad', title: 'Validar edad', kind: 'decision' });
      routes.push({ from: 'form_registro', to: 'decision_edad' });

      if (requiresApprovalForMinor) {
        steps.push({ id: 'aprobacion_menor', title: 'Aprobación de menor', kind: 'approval' });
        routes.push({ from: 'decision_edad', to: 'aprobacion_menor', when: `edad < ${minorThreshold}` });
      }

      steps.push({ id: 'fin', title: 'Finalizar', kind: 'end' });
      routes.push({ from: 'decision_edad', to: 'fin', when: `edad >= ${minorThreshold}` });

      if (requiresApprovalForMinor) {
        routes.push({ from: 'aprobacion_menor', to: 'fin', when: 'approved == true' });
      }
    } else {
      steps.push({ id: 'fin', title: 'Finalizar', kind: 'end' });
      routes.push({ from: 'form_registro', to: 'fin' });
    }

    const ambiguities: IntentAmbiguity[] = [];
    if (requiresApprovalForMinor && !/tutor|legal|manager|gerente|rol/.test(normalized)) {
      ambiguities.push({
        question: '¿Quién debe aprobar en el paso de menor de edad (rol o grupo)?',
        confidence: 0.62
      });
    }

    // Detect integrations
    const integrations: Array<{ id: string; type: string; label: string; requiresConfig: boolean }> = [];
    for (const pattern of this.integrationPatterns) {
      const regex = new RegExp(pattern.keywords.join('|'), 'i');
      if (regex.test(normalized)) {
        const integrationId = `integration_${pattern.type}_${Date.now()}`;
        integrations.push({
          id: integrationId,
          type: pattern.type,
          label: pattern.label,
          requiresConfig: true
        });

        // Add integration step
        steps.splice(steps.length - 1, 0, {
          id: integrationId,
          title: pattern.label,
          kind: 'integration'
        });

        // Add route to integration
        const lastNonEndStep = steps[steps.length - 3];
        if (lastNonEndStep) {
          routes.push({ from: lastNonEndStep.id, to: integrationId });
          routes.push({ from: integrationId, to: 'fin' });
        }

        // Add ambiguity for integration configuration
        ambiguities.push({
          question: `¿Qué configuración específica necesitas para ${pattern.label}?`,
          confidence: 0.75
        });
      }
    }

    return {
      sourceText: text,
      workflowName: hasRegistration ? 'Flujo de registro' : 'Flujo generado por lenguaje natural',
      fields,
      steps,
      routes,
      integrations: integrations.length > 0 ? integrations : undefined,
      ambiguities
    };
  }

  compile(intent: IntermediateIntentModel): Partial<WorkflowDefinition> {
    const workflowSteps: WorkflowStep[] = intent.steps
      .filter(step => step.kind !== 'decision')
      .map((step, index) => {
        const nextRoute = intent.routes.find(route => route.from === step.id && !route.when);

        const fields = this.buildFieldsForStep(step.id, intent.fields);

        const wfStep: WorkflowStep = {
          id: step.id,
          title: { es: step.title, en: step.title },
          fields,
          layout: fields,
          navigation: nextRoute ? { nextStep: nextRoute.to } : undefined,
          position: { x: 50 + index * 450, y: 50 },
          dimensions: { width: 360, height: 650 }
        };

        if (step.kind === 'approval') {
          wfStep.fields = [
            {
              id: 'approval_message',
              type: 'message',
              label: { es: 'Se requiere aprobación para continuar', en: 'Approval is required to continue' },
              required: false,
              defaultValue: 'pending'
            }
          ];
          wfStep.layout = wfStep.fields;
          wfStep.validationRules = [
            {
              fieldId: 'approval_message',
              rule: 'value != null',
              errorMessage: { es: 'Debe registrarse una decisión de aprobación', en: 'An approval decision is required' }
            }
          ];
        }

        return wfStep;
      });

    const decision = intent.steps.find(step => step.kind === 'decision');
    if (decision) {
      const incoming = intent.routes.find(route => route.to === decision.id);
      const outgoing = intent.routes.filter(route => route.from === decision.id);

      if (incoming && outgoing.length > 0) {
        const source = workflowSteps.find(step => step.id === incoming.from);
        if (source) {
          const defaultRoute = outgoing.find(route => route.when?.includes('>=') || route.when?.includes('==')) ?? outgoing[0];
          source.navigation = { nextStep: defaultRoute.to };
          source.validationRules = [
            ...(source.validationRules ?? []),
            ...outgoing
              .filter(route => !!route.when)
              .map(route => ({
                fieldId: 'edad',
                rule: route.when!,
                errorMessage: { es: `Ruta condicional: ${route.when}`, en: `Conditional route: ${route.when}` }
              }))
          ];
        }
      }

      const approvalRoute = outgoing.find(route => route.to.includes('aprobacion'));
      if (approvalRoute && approvalRoute.when) {
        const endStep = workflowSteps.find(step => step.id === 'fin');
        const approvalStep = workflowSteps.find(step => step.id.includes('aprobacion'));
        if (approvalStep && endStep) {
          approvalStep.navigation = { nextStep: endStep.id };
          approvalStep.validationRules = [
            ...(approvalStep.validationRules ?? []),
            {
              fieldId: 'approval_message',
              rule: approvalRoute.when,
              errorMessage: { es: `Condición: ${approvalRoute.when}`, en: `Condition: ${approvalRoute.when}` }
            }
          ];
        }
      }
    }

    return {
      name: { es: intent.workflowName, en: intent.workflowName },
      description: {
        es: `Generado desde: ${intent.sourceText}`,
        en: `Generated from: ${intent.sourceText}`
      },
      steps: workflowSteps
    };
  }

  generateFromText(text: string): WorkflowGenerationResult {
    const intent = this.interpret(text);
    return {
      intent,
      workflow: this.compile(intent)
    };
  }

  private buildFieldsForStep(stepId: string, fields: IntermediateIntentModel['fields']): FormField[] {
    if (!stepId.includes('form')) {
      return [];
    }

    return fields.map((field, index) => ({
      id: field.id,
      type: field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'shortText',
      label: { es: field.label, en: field.label },
      required: field.required,
      placeholder: { es: `Ingrese ${field.label.toLowerCase()}`, en: `Enter ${field.label.toLowerCase()}` },
      position: { x: 0, y: index * 100 },
      dimensions: { width: 100, height: 90 }
    }));
  }

  private extractMinorThreshold(text: string): number | undefined {
    const direct = text.match(/menor\s+de\s+(\d+)/);
    if (direct?.[1]) {
      return Number(direct[1]);
    }

    const symbol = text.match(/<\s*(\d+)/);
    if (symbol?.[1]) {
      return Number(symbol[1]);
    }

    return undefined;
  }
}
