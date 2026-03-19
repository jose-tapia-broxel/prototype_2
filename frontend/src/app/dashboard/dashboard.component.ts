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
      name: { en: 'Broxel Basic Enrollment', es: 'Enrolamiento Básico Broxel' },
      description: { en: 'A start-to-finish onboarding inspired by Broxel’s basic enrollment flow: email, identity, address, biometrics, legal terms, and confirmation.', es: 'Un onboarding de principio a fin inspirado en el flujo básico de enrolamiento de Broxel: correo, identidad, domicilio, biometría, legales y confirmación.' },
      category: 'Onboarding',
      steps: [
        {
          id: 'step_email',
          title: { en: 'Email Registration', es: 'Registro de Correo' },
          position: { x: 100, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'email', type: 'email', label: { en: 'Personal Email', es: 'Correo Electrónico Personal' }, required: true, placeholder: { en: 'name@example.com', es: 'nombre@correo.com' }, position: { x: 20, y: 100 }, dimensions: { width: 320, height: 45 } },
            { id: 'confirmEmail', type: 'email', label: { en: 'Confirm Email', es: 'Confirmar Correo Electrónico' }, required: true, placeholder: { en: 'Repeat your email', es: 'Repite tu correo' }, position: { x: 20, y: 180 }, dimensions: { width: 320, height: 45 } },
            { id: 'emailOwnership', type: 'checkbox', label: { en: 'I confirm this email belongs to me', es: 'Confirmo que este correo me pertenece' }, required: true, position: { x: 20, y: 250 }, dimensions: { width: 320, height: 30 } }
          ],
          navigation: { nextStep: 'step_identity' }
        },
        {
          id: 'step_identity',
          title: { en: 'Identity Data', es: 'Datos de Identidad' },
          position: { x: 550, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'fullName', type: 'shortText', label: { en: 'Full Legal Name', es: 'Nombre Completo' }, required: true, position: { x: 20, y: 100 }, dimensions: { width: 320, height: 45 } },
            { id: 'curp', type: 'shortText', label: { en: 'CURP / Government ID', es: 'CURP / Identificación Oficial' }, required: true, position: { x: 20, y: 180 }, dimensions: { width: 320, height: 45 } },
            { id: 'birthDate', type: 'shortText', label: { en: 'Date of Birth (DD/MM/YYYY)', es: 'Fecha de Nacimiento (DD/MM/AAAA)' }, required: true, position: { x: 20, y: 260 }, dimensions: { width: 320, height: 45 } }
          ],
          navigation: { nextStep: 'step_address' }
        },
        {
          id: 'step_address',
          title: { en: 'Address', es: 'Domicilio' },
          position: { x: 1000, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'zipCode', type: 'shortText', label: { en: 'ZIP Code', es: 'Código Postal' }, required: true, position: { x: 20, y: 100 }, dimensions: { width: 320, height: 45 } },
            { id: 'street', type: 'shortText', label: { en: 'Street and Number', es: 'Calle y Número' }, required: true, position: { x: 20, y: 180 }, dimensions: { width: 320, height: 45 } },
            { id: 'city', type: 'shortText', label: { en: 'City', es: 'Ciudad' }, required: true, position: { x: 20, y: 260 }, dimensions: { width: 320, height: 45 } }
          ],
          navigation: { nextStep: 'step_biometrics' }
        },
        {
          id: 'step_biometrics',
          title: { en: 'Biometrics', es: 'Biometría' },
          position: { x: 1450, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'idFront', type: 'imageDropzone', label: { en: 'Upload ID Front', es: 'Subir Frente de Identificación' }, required: true, position: { x: 20, y: 100 }, dimensions: { width: 320, height: 140 } },
            { id: 'idBack', type: 'imageDropzone', label: { en: 'Upload ID Back', es: 'Subir Reverso de Identificación' }, required: true, position: { x: 20, y: 260 }, dimensions: { width: 320, height: 140 } },
            { id: 'selfie', type: 'imageDropzone', label: { en: 'Take or Upload Selfie', es: 'Tomar o Subir Selfie' }, required: true, position: { x: 20, y: 420 }, dimensions: { width: 320, height: 140 } }
          ],
          navigation: { nextStep: 'step_legales' }
        },
        {
          id: 'step_legales',
          title: { en: 'Legal Terms', es: 'Legales' },
          position: { x: 1900, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'privacyNotice', type: 'checkbox', label: { en: 'I accept the privacy notice', es: 'Acepto el aviso de privacidad' }, required: true, position: { x: 20, y: 120 }, dimensions: { width: 320, height: 30 } },
            { id: 'terms', type: 'checkbox', label: { en: 'I accept terms and conditions', es: 'Acepto términos y condiciones' }, required: true, position: { x: 20, y: 180 }, dimensions: { width: 320, height: 30 } },
            { id: 'dataConsent', type: 'checkbox', label: { en: 'I authorize identity validation', es: 'Autorizo validación de identidad' }, required: true, position: { x: 20, y: 240 }, dimensions: { width: 320, height: 30 } }
          ],
          navigation: { nextStep: 'step_confirmation' }
        },
        {
          id: 'step_confirmation',
          title: { en: 'Confirmation', es: 'Confirmación' },
          position: { x: 2350, y: 100 },
          dimensions: { width: 360, height: 650 },
          fields: [
            { id: 'enrollmentMessage', type: 'message', label: { en: 'Your enrollment request is complete and in validation.', es: 'Tu solicitud de enrolamiento fue completada y está en validación.' }, required: false, position: { x: 20, y: 140 }, dimensions: { width: 320, height: 120 } },
            { id: 'folio', type: 'shortText', label: { en: 'Reference Folio', es: 'Folio de Referencia' }, required: false, defaultValue: 'BROX-ENR-0001', position: { x: 20, y: 300 }, dimensions: { width: 320, height: 45 } }
          ],
          navigation: { nextStep: null }
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
          { id: 'app_1', organizationId: 'org_1', appKey: 'broxel_onboarding', name: 'Broxel Customer Onboarding' },
          { id: 'app_2', organizationId: 'org_1', appKey: 'merchant_onboarding', name: 'Merchant Onboarding' },
          { id: 'app_3', organizationId: 'org_1', appKey: 'wallet_onboarding', name: 'Wallet Activation Onboarding' }
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
            workflowName: 'Broxel Customer Onboarding',
            applicationName: 'Broxel Onboarding Hub'
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
            workflowName: 'Merchant Onboarding',
            applicationName: 'Partner Portal'
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
            workflowName: 'Wallet Activation Onboarding',
            applicationName: 'Wallet Platform'
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
