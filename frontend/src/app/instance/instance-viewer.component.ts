import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { 
  WorkflowInstance, 
  WorkflowExecutionLog, 
  Submission, 
  WorkflowNode,
  WorkflowInstanceStatus
} from '../models/api.model';
import { ApiClientService } from '../core/api/api-client.service';
import { LanguageService } from '../language.service';

/**
 * Workflow Instance Viewer Component
 * Phase 5: Frontend Core - Display running instances, node details, submission history, status timeline
 */
@Component({
  selector: 'app-instance-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex-1 w-full max-w-7xl mx-auto p-6 py-8">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <a routerLink="/" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-slate-600">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </a>
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-slate-900">
            {{ instance()?.workflowName || (lang.currentLang() === 'es' ? 'Instancia de Flujo' : 'Workflow Instance') }}
          </h1>
          <p class="text-slate-500 text-sm">
            ID: <span class="font-mono">{{ instance()?.id }}</span>
          </p>
        </div>
        <div [class]="'px-3 py-1.5 rounded-full text-sm font-medium ' + getStatusBadgeClass()">
          {{ getStatusLabel() }}
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex justify-center items-center py-24">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Current Node Section -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  {{ lang.currentLang() === 'es' ? 'Nodo Actual' : 'Current Node' }}
                </h2>
              </div>
              <div class="p-6">
                @if (currentNode()) {
                  <div class="flex items-start gap-4">
                    <div [class]="'w-12 h-12 rounded-xl flex items-center justify-center ' + getNodeTypeClass(currentNode()!.nodeType)">
                      @switch (currentNode()!.nodeType) {
                        @case ('form') {
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                          </svg>
                        }
                        @case ('decision') {
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                          </svg>
                        }
                        @case ('action') {
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                          </svg>
                        }
                        @default {
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        }
                      }
                    </div>
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-slate-900">{{ currentNode()!.label }}</h3>
                      <p class="text-sm text-slate-500 capitalize">{{ currentNode()!.nodeType.replace('_', ' ') }}</p>
                      @if (currentNode()!.configJson && Object.keys(currentNode()!.configJson).length > 0) {
                        <div class="mt-3 p-3 bg-slate-50 rounded-lg">
                          <p class="text-xs font-bold text-slate-400 uppercase mb-2">Configuration</p>
                          <pre class="text-xs text-slate-600 overflow-auto max-h-32">{{ currentNode()!.configJson | json }}</pre>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <p class="text-slate-500 text-center py-8">
                    {{ lang.currentLang() === 'es' ? 'No hay nodo activo' : 'No active node' }}
                  </p>
                }
                
                <!-- Action Buttons -->
                @if (instance()?.status === 'running' || instance()?.status === 'paused') {
                  <div class="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                    @if (instance()?.status === 'running') {
                      <button (click)="pauseInstance()" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        {{ lang.currentLang() === 'es' ? 'Pausar' : 'Pause' }}
                      </button>
                    }
                    @if (instance()?.status === 'paused') {
                      <button (click)="resumeInstance()" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        {{ lang.currentLang() === 'es' ? 'Reanudar' : 'Resume' }}
                      </button>
                    }
                    <button (click)="cancelInstance()" class="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
                      {{ lang.currentLang() === 'es' ? 'Cancelar' : 'Cancel' }}
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Submission History -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  {{ lang.currentLang() === 'es' ? 'Historial de Envíos' : 'Submission History' }}
                </h2>
              </div>
              <div class="divide-y divide-slate-200">
                @for (submission of submissions(); track submission.id) {
                  <div class="p-4 hover:bg-slate-50 transition-colors">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-mono text-sm text-slate-600">{{ submission.id }}</span>
                      <span [class]="'px-2 py-0.5 rounded-full text-xs font-medium ' + getSubmissionStatusClass(submission.status)">
                        {{ getSubmissionStatusLabel(submission.status) }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500">{{ formatDate(submission.createdAt) }}</p>
                    @if (submission.dataJson && Object.keys(submission.dataJson).length > 0) {
                      <details class="mt-2">
                        <summary class="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800">
                          {{ lang.currentLang() === 'es' ? 'Ver datos' : 'View data' }}
                        </summary>
                        <pre class="mt-2 p-2 bg-slate-50 rounded text-xs overflow-auto max-h-24">{{ submission.dataJson | json }}</pre>
                      </details>
                    }
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-500">
                    {{ lang.currentLang() === 'es' ? 'Sin envíos todavía' : 'No submissions yet' }}
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Sidebar - Timeline -->
          <div class="lg:col-span-1">
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
              <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  {{ lang.currentLang() === 'es' ? 'Línea de Tiempo' : 'Timeline' }}
                </h2>
              </div>
              <div class="p-4 max-h-[600px] overflow-y-auto">
                <div class="relative">
                  <!-- Timeline Line -->
                  <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                  
                  <!-- Timeline Items -->
                  @for (log of executionLogs(); track log.id; let first = $first; let last = $last) {
                    <div class="relative pl-10 pb-6" [class.pb-0]="last">
                      <!-- Timeline Dot -->
                      <div [class]="'absolute left-2 w-4 h-4 rounded-full border-2 border-white ' + getLogDotClass(log)"></div>
                      
                      <div>
                        <p class="text-sm font-medium text-slate-900">{{ log.action }}</p>
                        <p class="text-xs text-slate-500">
                          {{ log.previousStatus }} → {{ log.newStatus }}
                        </p>
                        <p class="text-xs text-slate-400 mt-1">{{ formatDate(log.createdAt) }}</p>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center text-slate-500 text-sm py-4">
                      {{ lang.currentLang() === 'es' ? 'Sin actividad registrada' : 'No activity recorded' }}
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Context Data -->
            @if (instance()?.contextJson && Object.keys(instance()!.contextJson).length > 0) {
              <div class="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    {{ lang.currentLang() === 'es' ? 'Contexto' : 'Context' }}
                  </h2>
                </div>
                <div class="p-4">
                  <pre class="text-xs text-slate-600 overflow-auto max-h-48">{{ instance()!.contextJson | json }}</pre>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  host: { class: 'flex-1 flex flex-col' }
})
export class InstanceViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClientService);
  lang = inject(LanguageService);

  // Expose Object for template usage
  Object = Object;

  loading = signal(true);
  instance = signal<WorkflowInstance | null>(null);
  currentNode = signal<WorkflowNode | null>(null);
  submissions = signal<Submission[]>([]);
  executionLogs = signal<WorkflowExecutionLog[]>([]);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadInstance(id);
      }
    });
  }

  loadInstance(id: string) {
    this.loading.set(true);
    
    // Load instance
    this.apiClient.getWorkflowInstance(id).subscribe({
      next: (data) => {
        this.instance.set(data);
        this.loading.set(false);
        
        // Load related data
        this.loadSubmissions(id);
        this.loadExecutionLogs(id);
        
        // Mock current node for demo (in real app, fetch from API)
        if (data.currentNodeId) {
          this.currentNode.set({
            id: data.currentNodeId,
            workflowId: data.workflowId,
            organizationId: data.organizationId,
            nodeType: 'form',
            label: data.currentNodeLabel || 'Current Step',
            configJson: {},
            positionX: 0,
            positionY: 0,
            isStartNode: false,
            isEndNode: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      },
      error: () => {
        // Mock data for development
        this.instance.set({
          id,
          organizationId: 'org_1',
          applicationId: 'app_1',
          applicationVersionId: 'ver_1',
          workflowId: 'wf_1',
          currentNodeId: 'node_2',
          status: 'running',
          contextJson: { userId: 'user_123', step: 2 },
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
          workflowName: 'Employee Onboarding',
          currentNodeLabel: 'Equipment Request'
        });
        this.currentNode.set({
          id: 'node_2',
          workflowId: 'wf_1',
          organizationId: 'org_1',
          nodeType: 'form',
          label: 'Equipment Request',
          configJson: { formId: 'form_equipment' },
          positionX: 200,
          positionY: 100,
          isStartNode: false,
          isEndNode: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        this.loading.set(false);
        
        // Mock submissions and logs
        this.submissions.set([
          {
            id: 'sub_1',
            organizationId: 'org_1',
            applicationId: 'app_1',
            workflowInstanceId: id,
            nodeId: 'node_1',
            status: 'completed',
            dataJson: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            createdAt: new Date(Date.now() - 3500000).toISOString()
          }
        ]);
        this.executionLogs.set([
          {
            id: 'log_1',
            instanceId: id,
            nodeId: 'node_1',
            action: 'Instance Started',
            previousStatus: 'pending',
            newStatus: 'running',
            contextSnapshot: {},
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'log_2',
            instanceId: id,
            nodeId: 'node_1',
            action: 'Form Submitted',
            previousStatus: 'running',
            newStatus: 'running',
            contextSnapshot: { step: 1 },
            createdAt: new Date(Date.now() - 3500000).toISOString()
          },
          {
            id: 'log_3',
            instanceId: id,
            nodeId: 'node_2',
            action: 'Moved to Next Node',
            previousStatus: 'running',
            newStatus: 'running',
            contextSnapshot: { step: 2 },
            createdAt: new Date(Date.now() - 3400000).toISOString()
          }
        ]);
      }
    });
  }

  loadSubmissions(instanceId: string) {
    this.apiClient.getInstanceSubmissions(instanceId).subscribe({
      next: (data) => this.submissions.set(data),
      error: () => { /* Already using mock data */ }
    });
  }

  loadExecutionLogs(instanceId: string) {
    this.apiClient.getWorkflowExecutionLogs(instanceId).subscribe({
      next: (data) => this.executionLogs.set(data),
      error: () => { /* Already using mock data */ }
    });
  }

  pauseInstance() {
    const id = this.instance()?.id;
    if (!id) return;
    
    this.apiClient.pauseWorkflowInstance(id).subscribe({
      next: (updated: WorkflowInstance) => this.instance.set(updated),
      error: () => {
        // Optimistic update for demo
        this.instance.update((inst: WorkflowInstance | null) => inst ? { ...inst, status: 'paused' as WorkflowInstanceStatus } : null);
      }
    });
  }

  resumeInstance() {
    const id = this.instance()?.id;
    if (!id) return;
    
    this.apiClient.resumeWorkflowInstance(id).subscribe({
      next: (updated: WorkflowInstance) => this.instance.set(updated),
      error: () => {
        this.instance.update((inst: WorkflowInstance | null) => inst ? { ...inst, status: 'running' as WorkflowInstanceStatus } : null);
      }
    });
  }

  cancelInstance() {
    const id = this.instance()?.id;
    if (!id) return;
    
    if (confirm(this.lang.currentLang() === 'es' ? '¿Cancelar esta instancia?' : 'Cancel this instance?')) {
      this.apiClient.cancelWorkflowInstance(id).subscribe({
        next: () => this.router.navigate(['/']),
        error: () => this.router.navigate(['/'])
      });
    }
  }

  getStatusBadgeClass(): string {
    const status = this.instance()?.status;
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  }

  getStatusLabel(): string {
    const status = this.instance()?.status;
    const isEs = this.lang.currentLang() === 'es';
    switch (status) {
      case 'pending': return isEs ? 'Pendiente' : 'Pending';
      case 'running': return isEs ? 'En Ejecución' : 'Running';
      case 'paused': return isEs ? 'Pausado' : 'Paused';
      case 'completed': return isEs ? 'Completado' : 'Completed';
      case 'failed': return isEs ? 'Fallido' : 'Failed';
      case 'cancelled': return isEs ? 'Cancelado' : 'Cancelled';
      default: return status || '';
    }
  }

  getNodeTypeClass(nodeType: string): string {
    switch (nodeType) {
      case 'form': return 'bg-indigo-100 text-indigo-600';
      case 'decision': return 'bg-yellow-100 text-yellow-600';
      case 'action': return 'bg-green-100 text-green-600';
      case 'start': return 'bg-blue-100 text-blue-600';
      case 'end': return 'bg-gray-100 text-gray-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  getSubmissionStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  }

  getSubmissionStatusLabel(status: string): string {
    const isEs = this.lang.currentLang() === 'es';
    switch (status) {
      case 'pending': return isEs ? 'Pendiente' : 'Pending';
      case 'processing': return isEs ? 'Procesando' : 'Processing';
      case 'completed': return isEs ? 'Completado' : 'Completed';
      case 'failed': return isEs ? 'Fallido' : 'Failed';
      case 'rejected': return isEs ? 'Rechazado' : 'Rejected';
      default: return status;
    }
  }

  getLogDotClass(log: WorkflowExecutionLog): string {
    if (log.newStatus === 'completed') return 'bg-green-500';
    if (log.newStatus === 'failed') return 'bg-red-500';
    if (log.newStatus === 'running') return 'bg-blue-500';
    if (log.newStatus === 'paused') return 'bg-orange-500';
    return 'bg-slate-400';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.lang.currentLang() === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
