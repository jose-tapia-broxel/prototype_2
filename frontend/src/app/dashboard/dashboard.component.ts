import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../workflow.service';
import { WorkflowDefinition } from '../models/workflow.model';
import { LanguageService } from '../language.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: { class: 'flex-1 flex flex-col' }
})
export class DashboardComponent implements OnInit {
  private workflowService = inject(WorkflowService);
  lang = inject(LanguageService);
  
  workflows = signal<WorkflowDefinition[]>([]);
  groupBy = signal<'none' | 'category'>('none');

  groupedWorkflows = computed(() => {
    const list = this.workflows();
    if (this.groupBy() === 'none') return [];

    const groups: Record<string, WorkflowDefinition[]> = {};
    list.forEach(w => {
      const cat = w.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(w);
    });

    return Object.entries(groups).map(([name, items]) => ({ name, items }));
  });

  ngOnInit() {
    this.loadWorkflows();
  }

  loadWorkflows() {
    this.workflowService.getWorkflows().subscribe(data => {
      this.workflows.set(data);
    });
  }

  setGroupBy(value: 'none' | 'category') {
    this.groupBy.set(value);
  }

  forkWorkflow(id: string) {
    this.workflowService.forkWorkflow(id).subscribe(() => {
      this.loadWorkflows();
    });
  }

  generateSample() {
    const sample: Partial<WorkflowDefinition> = {
      name: { en: 'Customer Feedback Loop', es: 'Ciclo de Retroalimentación del Cliente' },
      description: { en: 'A multi-step process to gather and route customer feedback.', es: 'Un proceso de varios pasos para recopilar y dirigir la retroalimentación del cliente.' },
      category: 'Customer Success',
      steps: [
        {
          id: 'step_1',
          title: { en: 'Initial Rating', es: 'Calificación Inicial' },
          position: { x: 100, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'rating', type: 'dropdown', label: { en: 'How likely are you to recommend us?', es: '¿Qué tan probable es que nos recomiendes?' }, required: true, options: ['1 - Not Likely', '2', '3', '4', '5 - Very Likely'], position: { x: 20, y: 100 }, dimensions: { width: 320, height: 45 } },
            { id: 'comment', type: 'longText', label: { en: 'Why did you give this score?', es: '¿Por qué diste esta puntuación?' }, required: false, position: { x: 20, y: 180 }, dimensions: { width: 320, height: 120 } }
          ],
          navigation: { nextStep: 'step_2' }
        },
        {
          id: 'step_2',
          title: { en: 'Contact Info', es: 'Información de Contacto' },
          position: { x: 550, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'email', type: 'email', label: { en: 'Your Email', es: 'Tu Correo Electrónico' }, required: true, position: { x: 20, y: 100 }, dimensions: { width: 320, height: 45 } },
            { id: 'followup', type: 'checkbox', label: { en: 'Can we contact you for more details?', es: '¿Podemos contactarte para más detalles?' }, required: false, position: { x: 20, y: 180 }, dimensions: { width: 320, height: 30 } }
          ]
        }
      ]
    };

    this.workflowService.createWorkflow(sample).subscribe(() => {
      this.loadWorkflows();
    });
  }
}
