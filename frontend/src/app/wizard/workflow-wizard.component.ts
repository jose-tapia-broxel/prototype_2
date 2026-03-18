import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../workflow.service';
import { WorkflowDefinition, WorkflowStep } from '../models/workflow.model';

type TriggerType = 'form' | 'email' | 'schedule' | 'manual';
type Frequency = 'high' | 'daily' | 'weekly' | 'sporadic';

interface WizardAnswers {
  goal: string;
  currentPlace: string;
  trigger: TriggerType;
  frequency: Frequency;
  team: string;
  approver: string;
  hasApproval: boolean;
  approvalLevels: 'single' | 'multi';
  escalationCriteria: string;
  mainSteps: string;
  requiredData: string;
  conditionalRule: string;
  conditionalAction: string;
  integrations: string[];
  integrationActions: string;
  sensitiveProcess: boolean;
  kpi: string;
  notifyAudience: string;
  mode: 'recommended' | 'advanced';
}

@Component({
  selector: 'app-workflow-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workflow-wizard.component.html',
  styleUrl: './workflow-wizard.component.css',
  host: { class: 'flex-1 flex flex-col' }
})
export class WorkflowWizardComponent {
  private workflowService = inject(WorkflowService);
  private router = inject(Router);

  loading = signal(false);
  createdId = signal<string | null>(null);

  steps = [
    'Contexto',
    'Inicio del proceso',
    'Actores',
    'Pasos clave',
    'Reglas',
    'Integraciones',
    'Resultado',
    'Confirmación'
  ];

  current = signal(0);

  answers: WizardAnswers = {
    goal: '',
    currentPlace: '',
    trigger: 'form',
    frequency: 'daily',
    team: '',
    approver: '',
    hasApproval: true,
    approvalLevels: 'single',
    escalationCriteria: '',
    mainSteps: '',
    requiredData: '',
    conditionalRule: '',
    conditionalAction: '',
    integrations: [],
    integrationActions: '',
    sensitiveProcess: false,
    kpi: '',
    notifyAudience: '',
    mode: 'recommended'
  };

  generatedSpec = computed(() => this.buildSpec());
  generatedWorkflow = computed(() => this.toWorkflowDefinition());

  canContinue = computed(() => {
    switch (this.current()) {
      case 0:
        return !!this.answers.goal.trim() && !!this.answers.currentPlace.trim();
      case 1:
        return this.answers.trigger !== undefined && (this.answers.trigger === 'manual' || !!this.answers.frequency);
      case 2:
        return !!this.answers.team.trim() && (!this.answers.hasApproval || !!this.answers.approver.trim());
      case 3:
        return !!this.answers.mainSteps.trim() && !!this.answers.requiredData.trim();
      case 4:
        return !!this.answers.conditionalRule.trim() && !!this.answers.conditionalAction.trim();
      case 5:
        return this.answers.integrations.length > 0 && !!this.answers.integrationActions.trim();
      case 6:
        return !!this.answers.kpi.trim() && !!this.answers.notifyAudience.trim();
      default:
        return true;
    }
  });

  next(): void {
    if (!this.canContinue() || this.current() >= this.steps.length - 1) return;
    this.current.set(this.current() + 1);
  }

  prev(): void {
    if (this.current() === 0) return;
    this.current.set(this.current() - 1);
  }

  toggleIntegration(name: string): void {
    if (this.answers.integrations.includes(name)) {
      this.answers.integrations = this.answers.integrations.filter(item => item !== name);
      return;
    }
    this.answers.integrations = [...this.answers.integrations, name];
  }

  saveDraft(): void {
    this.persist('draft');
  }

  activateWorkflow(): void {
    this.persist('active');
  }

  private persist(state: 'draft' | 'active'): void {
    const workflow = this.generatedWorkflow();
    workflow.category = state === 'active' ? 'Auto-generated (active)' : 'Auto-generated (draft)';
    this.loading.set(true);
    this.workflowService.createWorkflow(workflow).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.createdId.set(created.id);
        void this.router.navigate(['/builder', created.id]);
      },
      error: () => this.loading.set(false)
    });
  }

  private buildSpec() {
    const baseSteps = this.answers.mainSteps
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const normalizedSteps = baseSteps.length > 0 ? baseSteps : ['Recibir', 'Revisar', 'Decidir', 'Notificar'];
    const rules = [
      {
        when: this.answers.conditionalRule || 'monto > 500',
        then: this.answers.conditionalAction || 'Escalar a aprobación'
      }
    ];

    return {
      workflow: {
        name: this.answers.goal || 'Nuevo workflow',
        trigger: {
          type: this.answers.trigger,
          frequency: this.answers.trigger === 'manual' ? 'on_demand' : this.answers.frequency,
          source: this.answers.currentPlace
        },
        actors: {
          team: this.answers.team,
          approver: this.answers.hasApproval ? this.answers.approver : 'No aplica',
          approvalLevels: this.answers.hasApproval ? this.answers.approvalLevels : 'none',
          escalationCriteria: this.answers.approvalLevels === 'multi' ? this.answers.escalationCriteria : ''
        },
        steps: normalizedSteps,
        requiredData: this.answers.requiredData,
        rules,
        integrations: this.answers.integrations.map(integration => ({
          provider: integration,
          action: this.answers.integrationActions
        })),
        controls: {
          sensitiveProcess: this.answers.sensitiveProcess,
          kpi: this.answers.kpi,
          notifyAudience: this.answers.notifyAudience,
          mode: this.answers.mode
        }
      }
    };
  }

  private toWorkflowDefinition(): Partial<WorkflowDefinition> {
    const spec = this.buildSpec().workflow;
    const cards = spec.steps.map((stepTitle, index): WorkflowStep => ({
      id: `step_${index + 1}`,
      title: stepTitle,
      fields: [
        {
          id: `field_${index + 1}_summary`,
          type: 'longText',
          label: `Información para: ${stepTitle}`,
          required: index === 0
        }
      ],
      navigation: {
        nextStep: index < spec.steps.length - 1 ? `step_${index + 2}` : undefined
      },
      position: { x: 100 + index * 420, y: 120 },
      dimensions: { width: 360, height: 620 }
    }));

    return {
      name: spec.name,
      description: `Generado por asistente: inicia por ${spec.trigger.type} y mide ${spec.controls.kpi}.`,
      successPath: `Notificar a ${spec.controls.notifyAudience}`,
      errorHandlingPath: 'Enviar alerta al responsable para revisión manual.',
      notes: `Regla principal: ${spec.rules[0].when} => ${spec.rules[0].then}. Integraciones: ${spec.integrations.map(i => i.provider).join(', ')}`,
      steps: cards,
      totalSteps: cards.length
    };
  }
}
