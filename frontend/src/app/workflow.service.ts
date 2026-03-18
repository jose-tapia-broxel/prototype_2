import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowDefinition, FormSubmission } from './models/workflow.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private http = inject(HttpClient);
  private apiUrl = '/api/workflows';

  getWorkflows(): Observable<WorkflowDefinition[]> {
    return this.http.get<WorkflowDefinition[]>(this.apiUrl);
  }

  getWorkflow(id: string): Observable<WorkflowDefinition> {
    return this.http.get<WorkflowDefinition>(`${this.apiUrl}/${id}`);
  }

  createWorkflow(workflow: Partial<WorkflowDefinition>): Observable<WorkflowDefinition> {
    return this.http.post<WorkflowDefinition>(this.apiUrl, workflow);
  }

  updateWorkflow(id: string, workflow: WorkflowDefinition): Observable<WorkflowDefinition> {
    return this.http.put<WorkflowDefinition>(`${this.apiUrl}/${id}`, workflow);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  forkWorkflow(id: string): Observable<WorkflowDefinition> {
    return this.http.post<WorkflowDefinition>(`${this.apiUrl}/${id}/fork`, {});
  }

  submitWorkflow(id: string, data: Record<string, unknown>): Observable<FormSubmission> {
    return this.http.post<FormSubmission>(`${this.apiUrl}/${id}/submissions`, data);
  }

  getSubmissions(id: string): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.apiUrl}/${id}/submissions`);
  }
}
