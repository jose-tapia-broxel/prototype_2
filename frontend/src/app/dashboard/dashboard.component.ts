import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../workflow.service';
import { WorkflowDefinition } from '../models/workflow.model';
import { 
  Application, 
  WorkflowInstance, 
  WorkflowInstanceStatus, 
  PaginatedResponse 
} from '../models/api.model';
import { ApiClientService } from '../core/api/api-client.service';
import { LanguageService } from '../language.service';

type DashboardTab = 'workflows' | 'applications' | 'instances';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: { class: 'flex-1 flex flex-col' }
})
export class DashboardComponent implements OnInit {
  private workflowService = inject(WorkflowService);
  private apiClient = inject(ApiClientService);
  lang = inject(LanguageService);
  
  // Tab management
  activeTab = signal<DashboardTab>('workflows');

  // Loading states
  loading = computed(() => this.apiClient.loading());

  // Workflows data (existing)
  workflows = signal<WorkflowDefinition[]>([]);
  groupBy = signal<'none' | 'category'>('none');

  // Applications data
  applications = signal<Application[]>([]);
  applicationsPage = signal(1);
  applicationsTotalPages = signal(1);

  // Workflow Instances data
  instances = signal<WorkflowInstance[]>([]);
  instancesPage = signal(1);
  instancesTotalPages = signal(1);
  instanceStatusFilter = signal<WorkflowInstanceStatus | 'all'>('all');

  // Status options for filtering
  statusOptions: { value: WorkflowInstanceStatus | 'all'; label: string; labelEs: string }[] = [
    { value: 'all', label: 'All Statuses', labelEs: 'Todos los Estados' },
    { value: 'pending', label: 'Pending', labelEs: 'Pendiente' },
    { value: 'running', label: 'Running', labelEs: 'En Ejecución' },
    { value: 'paused', label: 'Paused', labelEs: 'Pausado' },
    { value: 'completed', label: 'Completed', labelEs: 'Completado' },
    { value: 'failed', label: 'Failed', labelEs: 'Fallido' },
    { value: 'cancelled', label: 'Cancelled', labelEs: 'Cancelado' }
  ];

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
    this.loadApplications();
    this.loadInstances();
  }

  setTab(tab: DashboardTab) {
    this.activeTab.set(tab);
  }

  // ============================================================================
  // Workflows (existing functionality)
  // ============================================================================

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

  // ============================================================================
  // Applications
  // ============================================================================

  loadApplications(page = 1) {
    this.applicationsPage.set(page);
    this.apiClient.getApplications({ page, pageSize: 10 }).subscribe({
      next: (response: PaginatedResponse<Application>) => {
        this.applications.set(response.data);
        this.applicationsTotalPages.set(response.totalPages);
      },
      error: () => {
        // Mock data for development when API is not available
        this.applications.set([
          { id: 'app_1', organizationId: 'org_1', appKey: 'onboarding', name: 'Employee Onboarding' },
          { id: 'app_2', organizationId: 'org_1', appKey: 'feedback', name: 'Customer Feedback' },
          { id: 'app_3', organizationId: 'org_1', appKey: 'expense', name: 'Expense Approval' }
        ]);
      }
    });
  }

  navigateApplicationsPage(direction: 'prev' | 'next') {
    const currentPage = this.applicationsPage();
    const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    if (newPage >= 1 && newPage <= this.applicationsTotalPages()) {
      this.loadApplications(newPage);
    }
  }

  // ============================================================================
  // Workflow Instances
  // ============================================================================

  loadInstances(page = 1) {
    this.instancesPage.set(page);
    const status = this.instanceStatusFilter();
    const filters = {
      page,
      pageSize: 10,
      ...(status !== 'all' && { status })
    };

    this.apiClient.getWorkflowInstances(filters).subscribe({
      next: (response: PaginatedResponse<WorkflowInstance>) => {
        this.instances.set(response.data);
        this.instancesTotalPages.set(response.totalPages);
      },
      error: () => {
        // Mock data for development when API is not available
        this.instances.set([
          {
            id: 'inst_1',
            organizationId: 'org_1',
            applicationId: 'app_1',
            applicationVersionId: 'ver_1',
            workflowId: 'wf_1',
            status: 'running',
            contextJson: {},
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            workflowName: 'Employee Onboarding',
            applicationName: 'HR System'
          },
          {
            id: 'inst_2',
            organizationId: 'org_1',
            applicationId: 'app_2',
            applicationVersionId: 'ver_1',
            workflowId: 'wf_2',
            status: 'completed',
            contextJson: {},
            startedAt: new Date(Date.now() - 86400000).toISOString(),
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            workflowName: 'Customer Feedback',
            applicationName: 'CRM'
          },
          {
            id: 'inst_3',
            organizationId: 'org_1',
            applicationId: 'app_3',
            applicationVersionId: 'ver_1',
            workflowId: 'wf_3',
            status: 'pending',
            contextJson: {},
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            workflowName: 'Expense Approval',
            applicationName: 'Finance'
          }
        ]);
      }
    });
  }

  onStatusFilterChange(status: WorkflowInstanceStatus | 'all') {
    this.instanceStatusFilter.set(status);
    this.loadInstances(1);
  }

  navigateInstancesPage(direction: 'prev' | 'next') {
    const currentPage = this.instancesPage();
    const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    if (newPage >= 1 && newPage <= this.instancesTotalPages()) {
      this.loadInstances(newPage);
    }
  }

  getStatusColor(status: WorkflowInstanceStatus): string {
    const colors: Record<WorkflowInstanceStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: WorkflowInstanceStatus): string {
    const option = this.statusOptions.find(o => o.value === status);
    return this.lang.currentLang() === 'es' ? (option?.labelEs || status) : (option?.label || status);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.lang.currentLang() === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
