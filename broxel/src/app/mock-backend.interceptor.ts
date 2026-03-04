import { HttpInterceptorFn, HttpResponse, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowDefinition, FormSubmission } from './models/workflow.model';

// --- In-Memory Database ---
let workflows: WorkflowDefinition[] = [
  {
    id: '1',
    name: 'Employee Onboarding',
    description: 'Collect initial information for new hires.',
    totalSteps: 2,
    successPath: 'User completes all steps and is shown a success message.',
    errorHandlingPath: 'If any step fails, the user is shown an error message.',
    steps: [
      {
        id: 'step1',
        title: 'Personal Details',
        layout: [
          { id: 'firstName', type: 'shortText', label: 'First Name', required: true },
          { id: 'lastName', type: 'shortText', label: 'Last Name', required: true },
          { id: 'email', type: 'email', label: 'Personal Email', required: true }
        ],
        fields: [
          { id: 'firstName', type: 'shortText', label: 'First Name', required: true },
          { id: 'lastName', type: 'shortText', label: 'Last Name', required: true },
          { id: 'email', type: 'email', label: 'Personal Email', required: true }
        ]
      },
      {
        id: 'step2',
        title: 'Equipment Request',
        layout: [
          { id: 'laptop', type: 'dropdown', label: 'Laptop Choice', required: true, options: ['MacBook Pro', 'Dell XPS', 'Lenovo ThinkPad'] },
          { id: 'accessories', type: 'checkbox', label: 'Need external monitor?', required: false }
        ],
        fields: [
          { id: 'laptop', type: 'dropdown', label: 'Laptop Choice', required: true, options: ['MacBook Pro', 'Dell XPS', 'Lenovo ThinkPad'] },
          { id: 'accessories', type: 'checkbox', label: 'Need external monitor?', required: false }
        ]
      }
    ]
  }
];
const submissions: FormSubmission[] = [];

export const mockBackendInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const { url, method, body } = req;

  return new Observable<HttpEvent<unknown>>(observer => {
    try {
      // GET /api/workflows
      if (url.endsWith('/api/workflows') && method === 'GET') {
        observer.next(new HttpResponse({ status: 200, body: workflows }));
        observer.complete();
        return;
      }

      // GET /api/workflows/:id
      if (url.match(/\/api\/workflows\/[^/]+$/) && method === 'GET') {
        const id = url.split('/').pop();
        const workflow = workflows.find(w => w.id === id);
        if (workflow) {
          observer.next(new HttpResponse({ status: 200, body: workflow }));
        } else {
          observer.error(new HttpErrorResponse({ status: 404, statusText: 'Not Found', url }));
        }
        observer.complete();
        return;
      }

      // POST /api/workflows
      if (url.endsWith('/api/workflows') && method === 'POST') {
        const newWorkflow = {
          ...(body as WorkflowDefinition),
          id: Date.now().toString()
        };
        workflows.push(newWorkflow);
        observer.next(new HttpResponse({ status: 201, body: newWorkflow }));
        observer.complete();
        return;
      }

      // PUT /api/workflows/:id
      if (url.match(/\/api\/workflows\/[^/]+$/) && method === 'PUT') {
        const id = url.split('/').pop();
        const index = workflows.findIndex(w => w.id === id);
        if (index !== -1) {
          workflows[index] = { ...(body as WorkflowDefinition), id: id! };
          observer.next(new HttpResponse({ status: 200, body: workflows[index] }));
        } else {
          observer.error(new HttpErrorResponse({ status: 404, statusText: 'Not Found', url }));
        }
        observer.complete();
        return;
      }

      // DELETE /api/workflows/:id
      if (url.match(/\/api\/workflows\/[^/]+$/) && method === 'DELETE') {
        const id = url.split('/').pop();
        workflows = workflows.filter(w => w.id !== id);
        observer.next(new HttpResponse({ status: 204 }));
        observer.complete();
        return;
      }

      // POST /api/workflows/:id/submissions
      if (url.match(/\/api\/workflows\/[^/]+\/submissions$/) && method === 'POST') {
        const parts = url.split('/');
        const workflowId = parts[parts.length - 2];
        const submission: FormSubmission = {
          id: Date.now().toString(),
          workflowId,
          data: body as Record<string, unknown>,
          submittedAt: new Date().toISOString()
        };
        submissions.push(submission);
        observer.next(new HttpResponse({ status: 201, body: submission }));
        observer.complete();
        return;
      }

      // GET /api/workflows/:id/submissions
      if (url.match(/\/api\/workflows\/[^/]+\/submissions$/) && method === 'GET') {
        const parts = url.split('/');
        const workflowId = parts[parts.length - 2];
        const workflowSubmissions = submissions.filter(s => s.workflowId === workflowId);
        observer.next(new HttpResponse({ status: 200, body: workflowSubmissions }));
        observer.complete();
        return;
      }

      // Pass through for any other requests
      next(req).subscribe({
        next: event => observer.next(event),
        error: err => observer.error(err),
        complete: () => observer.complete()
      });
    } catch {
      observer.error(new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error', url }));
    }
  });
};
