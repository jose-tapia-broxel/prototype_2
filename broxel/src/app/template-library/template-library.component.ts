import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../workflow.service';
import { TEMPLATE_CATEGORIES, TEMPLATE_LIBRARY } from './template-library.data';
import { TemplateDefinition, TemplateFieldOption } from './template-library.models';

@Component({
  selector: 'app-template-library',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './template-library.component.html',
  styleUrl: './template-library.component.css'
})
export class TemplateLibraryComponent {
  private workflowService = inject(WorkflowService);
  private router = inject(Router);

  readonly categories = TEMPLATE_CATEGORIES;
  readonly templates = TEMPLATE_LIBRARY;
  readonly step = signal(1);
  readonly selectedCategory = signal('Quick Wins');
  readonly selectedTemplate = signal<TemplateDefinition | null>(null);
  readonly context = signal({ businessType: '', audience: '', channel: '' });
  readonly fieldValues = signal<Record<string, string | number>>({});
  readonly launchMessage = signal('');

  readonly filteredTemplates = computed(() => {
    const category = this.selectedCategory();
    if (category === 'Quick Wins') return this.templates.slice(0, 3);
    return this.templates.filter(template => template.category === category);
  });

  chooseTemplate(template: TemplateDefinition) {
    this.selectedTemplate.set(template);
    const defaults = template.variables.reduce<Record<string, string | number>>((acc, field) => {
      if (field.defaultValue !== undefined) {
        acc[field.id] = field.defaultValue;
      }
      return acc;
    }, {});
    this.fieldValues.set(defaults);
    this.step.set(2);
  }

  setCategory(category: string) {
    this.selectedCategory.set(category);
  }

  updateContext(field: 'businessType' | 'audience' | 'channel', value: string) {
    this.context.update(current => ({ ...current, [field]: value }));
  }

  updateField(id: string, value: string) {
    const numeric = Number(value);
    this.fieldValues.update(current => ({ ...current, [id]: Number.isNaN(numeric) ? value : numeric }));
  }

  canContinueFromContext() {
    const current = this.context();
    return Boolean(current.businessType && current.audience && current.channel);
  }

  canLaunch() {
    const template = this.selectedTemplate();
    if (!template) return false;

    return template.variables
      .filter(field => field.required)
      .every(field => {
        const value = this.fieldValues()[field.id];
        return value !== undefined && value !== null && String(value).trim().length > 0;
      });
  }

  nextStep() {
    this.step.update(value => Math.min(value + 1, 4));
  }

  prevStep() {
    this.step.update(value => Math.max(value - 1, 1));
  }

  getFieldValue(field: TemplateFieldOption) {
    const value = this.fieldValues()[field.id];
    if (value !== undefined) return value;
    return field.defaultValue ?? '';
  }

  launchTemplate() {
    const template = this.selectedTemplate();
    if (!template || !this.canLaunch()) return;

    const workflow = template.createWorkflow(this.fieldValues());
    this.workflowService.createWorkflow(workflow).subscribe(created => {
      this.launchMessage.set('¡Flujo activado! Te llevamos al builder para seguir editando sin romper la base.');
      this.router.navigate(['/builder', created.id]);
    });
  }
}
