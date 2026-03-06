import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-workflow-wizard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto p-8">
      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 class="text-2xl font-bold text-slate-900">Workflow Wizard</h1>
        <p class="text-slate-600 mt-2">This wizard entrypoint is available for branch compatibility and guided creation flows.</p>
        <a routerLink="/builder/new" class="inline-flex mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium">
          Continue in Builder
        </a>
      </div>
    </div>
  `
})
export class WorkflowWizardComponent {}
