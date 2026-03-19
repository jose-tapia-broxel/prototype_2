import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../workflow.service';
import { WorkflowDefinition, WorkflowStep } from '../models/workflow.model';

interface WizardState {
  objective: string;
  currentChannel: string;
  triggerType: 'manual' | 'form_submitted' | 'email_received' | 'scheduled';
  frequency: string;
  participants: string[];
  approver: string;
  keySteps: string[];
  dataFields: string;
  routeCondition: string;
  routeActionHigh: string;
  routeActionLow: string;
  integrations: string[];
  integrationAction: string;
  successMetric: string;
  finalNotify: string;
  mode: 'recommended' | 'advanced';
}

@Component({
  selector: 'app-workflow-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-wizard.component.html'
})
export class WorkflowWizardComponent {
  private workflowService = inject(WorkflowService);

  currentStep = signal(0);
  steps = [
    'Contexto',
    'Disparador',
    'Actores',
    'Pasos clave',
    'Reglas',
    'Integraciones',
    'Resultado',
    'Preview'
  ];

  form = signal<WizardState>({
    objective: '',
    currentChannel: 'Email',
    triggerType: 'form_submitted',
    frequency: 'diario',
    participants: ['Operaciones'],
    approver: 'Líder de equipo',
    keySteps: ['Recibir', 'Revisar', 'Aprobar/Rechazar', 'Notificar'],
    dataFields: 'nombre, monto, fecha, motivo',
    routeCondition: 'monto > 500',
    routeActionHigh: 'Aprobación de Finanzas',
    routeActionLow: 'Aprobación de Líder',
    integrations: ['email'],
    integrationAction: 'Enviar notificación final',
    successMetric: 'SLA < 24h',
    finalNotify: 'Solicitante y responsable',
    mode: 'recommended'
  });

  workflowPreview = computed(() => this.buildWorkflowDefinition(this.form()));

  qualityChecklist = computed(() => {
    const wf = this.workflowPreview();
    const hasTrigger = !!wf.notes?.includes('Trigger');
    const steps = wf.steps ?? [];
    const allRoutesEnd = steps.every(s => !s.navigation?.nextStep || steps.some(next => next.id === s.navigation?.nextStep));
    const allResponsible = this.form().approver.trim().length > 0;
    const integrationDefined = this.form().integrations.length > 0;

    return [
      { label: 'Tiene trigger definido', ok: hasTrigger },
      { label: 'Todas las rutas terminan correctamente', ok: allRoutesEnd },
      { label: 'Hay responsable de aprobación', ok: allResponsible },
      { label: 'Integración o notificación configurada', ok: integrationDefined }
    ];
  });

  simulation = computed(() => {
    const amountHigh = this.form().routeCondition.match(/\d+/)?.[0] ?? '500';
    return [
      `Caso A (monto 200): ruta -> ${this.form().routeActionLow}`,
      `Caso B (monto ${amountHigh}): ruta -> ${this.form().routeActionHigh}`
    ];
  });

  parseCsv(value: string): string[] {
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }

  setField<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    this.form.update(s => ({ ...s, [key]: value }));
  }

  next() {
    if (this.currentStep() < this.steps.length - 1) this.currentStep.update(v => v + 1);
  }

  prev() {
    if (this.currentStep() > 0) this.currentStep.update(v => v - 1);
  }

  createFromWizard() {
    const workflow = this.workflowPreview();
    this.workflowService.createWorkflow(workflow).subscribe(created => {
      window.open(`/run/${created.id}`, '_blank', 'noopener,noreferrer');
    });
  }

  private buildWorkflowDefinition(state: WizardState): Partial<WorkflowDefinition> {
    const stepWidth = 360;
    const stepGap = 120;
    const decisionStepX = 40;
    const laneY = 120;

    const baseSteps: WorkflowStep[] = state.keySteps
      .filter(Boolean)
      .map((stepName, idx, arr) => ({
        id: `step_${idx + 1}`,
        title: { es: stepName, en: stepName },
        fields: [],
        navigation: { nextStep: idx < arr.length - 1 ? `step_${idx + 2}` : undefined },
        // Position generated screens in sequence with clear spacing to avoid overlap in canvas.
        position: { x: decisionStepX + stepWidth + stepGap + idx * (stepWidth + stepGap), y: laneY },
        dimensions: { width: stepWidth, height: 650 }
      }));

    const decisionStep: WorkflowStep = {
      id: 'route_by_condition',
      title: { es: 'Ruteo por condición', en: 'Route by condition' },
      fields: [
        {
          id: 'decision_note',
          type: 'message',
          required: false,
          label: {
            es: `Si ${state.routeCondition} => ${state.routeActionHigh}; de lo contrario => ${state.routeActionLow}`,
            en: `If ${state.routeCondition} => ${state.routeActionHigh}; otherwise => ${state.routeActionLow}`
          }
        }
      ],
      navigation: { nextStep: baseSteps[0]?.id },
      position: { x: decisionStepX, y: laneY },
      dimensions: { width: stepWidth, height: 650 }
    };

    return {
      name: { es: state.objective || 'Workflow desde wizard', en: state.objective || 'Wizard workflow' },
      description: {
        es: `Creado con asistente. Canal actual: ${state.currentChannel}. Métrica: ${state.successMetric}.`,
        en: `Created with wizard. Current channel: ${state.currentChannel}. Metric: ${state.successMetric}.`
      },
      category: 'Wizard',
      notes: `Trigger: ${state.triggerType} (${state.frequency}) | Participantes: ${state.participants.join(', ')} | Aprobador: ${state.approver}`,
      steps: [decisionStep, ...baseSteps]
    };
  }
}
