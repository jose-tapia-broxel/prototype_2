import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, finalize } from 'rxjs';
import {
  Application,
  ApplicationVersion,
  Workflow,
  WorkflowNode,
  WorkflowTransition,
  WorkflowWithDetails,
  WorkflowInstance,
  WorkflowInstanceFilters,
  Submission,
  SubmissionFilters,
  PaginatedResponse,
  ApplicationFilters,
  WorkflowExecutionLog,
  FormDefinition
} from '../../models/api.model';

/**
 * Type-safe API Client Service
 * Phase 5: Frontend Core - Centralized API communication
 */
@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  // Loading state signals for UI feedback
  loading = signal(false);
  private requestCount = 0;

  // ============================================================================
  // Applications API
  // ============================================================================

  getApplications(filters?: ApplicationFilters): Observable<PaginatedResponse<Application>> {
    return this.request<PaginatedResponse<Application>>(
      'GET',
      '/applications',
      undefined,
      this.buildParams(filters)
    );
  }

  getApplication(id: string): Observable<Application> {
    return this.request<Application>('GET', `/applications/${id}`);
  }

  createApplication(data: Partial<Application>): Observable<Application> {
    return this.request<Application>('POST', '/applications', data);
  }

  updateApplication(id: string, data: Partial<Application>): Observable<Application> {
    return this.request<Application>('PATCH', `/applications/${id}`, data);
  }

  deleteApplication(id: string): Observable<void> {
    return this.request<void>('DELETE', `/applications/${id}`);
  }

  // ============================================================================
  // Application Versions API
  // ============================================================================

  getApplicationVersions(applicationId: string): Observable<ApplicationVersion[]> {
    return this.request<ApplicationVersion[]>('GET', `/applications/${applicationId}/versions`);
  }

  getApplicationVersion(applicationId: string, versionId: string): Observable<ApplicationVersion> {
    return this.request<ApplicationVersion>('GET', `/applications/${applicationId}/versions/${versionId}`);
  }

  createDraftVersion(applicationId: string, definitionJson: Record<string, unknown>): Observable<ApplicationVersion> {
    return this.request<ApplicationVersion>('POST', `/applications/${applicationId}/versions`, {
      definitionJson,
      status: 'DRAFT'
    });
  }

  publishVersion(applicationId: string, versionId: string): Observable<ApplicationVersion> {
    return this.request<ApplicationVersion>('POST', `/applications/${applicationId}/versions/${versionId}/publish`);
  }

  // ============================================================================
  // Workflows API
  // ============================================================================

  getWorkflows(applicationId?: string): Observable<Workflow[]> {
    const params = applicationId ? { applicationId } : undefined;
    return this.request<Workflow[]>('GET', '/workflows', undefined, this.buildParams(params));
  }

  getWorkflow(id: string): Observable<Workflow> {
    return this.request<Workflow>('GET', `/workflows/${id}`);
  }

  getWorkflowWithDetails(id: string): Observable<WorkflowWithDetails> {
    return this.request<WorkflowWithDetails>('GET', `/workflows/${id}/details`);
  }

  createWorkflow(data: Partial<Workflow>): Observable<Workflow> {
    return this.request<Workflow>('POST', '/workflows', data);
  }

  updateWorkflow(id: string, data: Partial<Workflow>): Observable<Workflow> {
    return this.request<Workflow>('PATCH', `/workflows/${id}`, data);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.request<void>('DELETE', `/workflows/${id}`);
  }

  // ============================================================================
  // Workflow Nodes API
  // ============================================================================

  getWorkflowNodes(workflowId: string): Observable<WorkflowNode[]> {
    return this.request<WorkflowNode[]>('GET', `/workflows/${workflowId}/nodes`);
  }

  createWorkflowNode(workflowId: string, data: Partial<WorkflowNode>): Observable<WorkflowNode> {
    return this.request<WorkflowNode>('POST', `/workflows/${workflowId}/nodes`, data);
  }

  updateWorkflowNode(workflowId: string, nodeId: string, data: Partial<WorkflowNode>): Observable<WorkflowNode> {
    return this.request<WorkflowNode>('PATCH', `/workflows/${workflowId}/nodes/${nodeId}`, data);
  }

  deleteWorkflowNode(workflowId: string, nodeId: string): Observable<void> {
    return this.request<void>('DELETE', `/workflows/${workflowId}/nodes/${nodeId}`);
  }

  // ============================================================================
  // Workflow Transitions API
  // ============================================================================

  getWorkflowTransitions(workflowId: string): Observable<WorkflowTransition[]> {
    return this.request<WorkflowTransition[]>('GET', `/workflows/${workflowId}/transitions`);
  }

  createWorkflowTransition(workflowId: string, data: Partial<WorkflowTransition>): Observable<WorkflowTransition> {
    return this.request<WorkflowTransition>('POST', `/workflows/${workflowId}/transitions`, data);
  }

  updateWorkflowTransition(workflowId: string, transitionId: string, data: Partial<WorkflowTransition>): Observable<WorkflowTransition> {
    return this.request<WorkflowTransition>('PATCH', `/workflows/${workflowId}/transitions/${transitionId}`, data);
  }

  deleteWorkflowTransition(workflowId: string, transitionId: string): Observable<void> {
    return this.request<void>('DELETE', `/workflows/${workflowId}/transitions/${transitionId}`);
  }

  // ============================================================================
  // Workflow Instances API (Runtime)
  // ============================================================================

  getWorkflowInstances(filters?: WorkflowInstanceFilters): Observable<PaginatedResponse<WorkflowInstance>> {
    return this.request<PaginatedResponse<WorkflowInstance>>(
      'GET',
      '/runtime/instances',
      undefined,
      this.buildParams(filters)
    );
  }

  getWorkflowInstance(id: string): Observable<WorkflowInstance> {
    return this.request<WorkflowInstance>('GET', `/runtime/instances/${id}`);
  }

  startWorkflowInstance(workflowId: string, initialContext?: Record<string, unknown>): Observable<WorkflowInstance> {
    return this.request<WorkflowInstance>('POST', '/runtime/instances', {
      workflowId,
      contextJson: initialContext || {}
    });
  }

  advanceWorkflowInstance(instanceId: string, data?: Record<string, unknown>): Observable<WorkflowInstance> {
    return this.request<WorkflowInstance>('POST', `/runtime/instances/${instanceId}/advance`, data);
  }

  pauseWorkflowInstance(instanceId: string): Observable<WorkflowInstance> {
    return this.request<WorkflowInstance>('POST', `/runtime/instances/${instanceId}/pause`);
  }

  resumeWorkflowInstance(instanceId: string): Observable<WorkflowInstance> {
    return this.request<WorkflowInstance>('POST', `/runtime/instances/${instanceId}/resume`);
  }

  cancelWorkflowInstance(instanceId: string): Observable<WorkflowInstance> {
    return this.request<WorkflowInstance>('POST', `/runtime/instances/${instanceId}/cancel`);
  }

  getWorkflowExecutionLogs(instanceId: string): Observable<WorkflowExecutionLog[]> {
    return this.request<WorkflowExecutionLog[]>('GET', `/runtime/instances/${instanceId}/logs`);
  }

  // ============================================================================
  // Submissions API
  // ============================================================================

  getSubmissions(filters?: SubmissionFilters): Observable<PaginatedResponse<Submission>> {
    return this.request<PaginatedResponse<Submission>>(
      'GET',
      '/submissions',
      undefined,
      this.buildParams(filters)
    );
  }

  getSubmission(id: string): Observable<Submission> {
    return this.request<Submission>('GET', `/submissions/${id}`);
  }

  createSubmission(data: Partial<Submission>): Observable<Submission> {
    return this.request<Submission>('POST', '/submissions', data);
  }

  getInstanceSubmissions(instanceId: string): Observable<Submission[]> {
    return this.request<Submission[]>('GET', `/runtime/instances/${instanceId}/submissions`);
  }

  // ============================================================================
  // Forms API
  // ============================================================================

  getForms(applicationId?: string): Observable<FormDefinition[]> {
    const params = applicationId ? { applicationId } : undefined;
    return this.request<FormDefinition[]>('GET', '/forms', undefined, this.buildParams(params));
  }

  getForm(id: string): Observable<FormDefinition> {
    return this.request<FormDefinition>('GET', `/forms/${id}`);
  }

  createForm(data: Partial<FormDefinition>): Observable<FormDefinition> {
    return this.request<FormDefinition>('POST', '/forms', data);
  }

  updateForm(id: string, data: Partial<FormDefinition>): Observable<FormDefinition> {
    return this.request<FormDefinition>('PATCH', `/forms/${id}`, data);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    params?: HttpParams
  ): Observable<T> {
    this.startLoading();

    const url = `${this.baseUrl}${endpoint}`;
    let request$: Observable<T>;

    switch (method) {
      case 'GET':
        request$ = this.http.get<T>(url, { params });
        break;
      case 'POST':
        request$ = this.http.post<T>(url, body, { params });
        break;
      case 'PUT':
        request$ = this.http.put<T>(url, body, { params });
        break;
      case 'PATCH':
        request$ = this.http.patch<T>(url, body, { params });
        break;
      case 'DELETE':
        request$ = this.http.delete<T>(url, { params });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return request$.pipe(
      finalize(() => this.stopLoading()),
      catchError(error => this.handleError(error))
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildParams(filters?: any): HttpParams | undefined {
    if (!filters) return undefined;

    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => {
            params = params.append(key, String(v));
          });
        } else {
          params = params.set(key, String(value));
        }
      }
    });
    return params;
  }

  private startLoading(): void {
    this.requestCount++;
    this.loading.set(true);
  }

  private stopLoading(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this.loading.set(false);
    }
  }

  private handleError(error: unknown): Observable<never> {
    // Error handling is delegated to ErrorHandlingService via interceptor
    return throwError(() => error);
  }
}
