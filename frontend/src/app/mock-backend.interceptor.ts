import { HttpInterceptorFn, HttpResponse, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, Observer } from 'rxjs';
import { WorkflowDefinition, FormSubmission } from './models/workflow.model';

// --- In-Memory Database ---
let workflows: WorkflowDefinition[] = [
  {
    id: '1',
    name: { en: 'Broxel Basic Enrollment', es: 'Enrolamiento Básico Broxel' },
    description: { en: 'Start-to-finish enrollment inspired by Broxel’s basic registration flow.', es: 'Enrolamiento de inicio a fin inspirado en el flujo básico de registro de Broxel.' },
    totalSteps: 6,
    successPath: 'User completes email, identity, address, biometrics, legal terms, and receives confirmation.',
    errorHandlingPath: 'If required data is missing, keep applicant on current step and show validation feedback.',
    steps: [
      {
        id: 'step_email',
        title: { en: 'Email Registration', es: 'Registro de Correo' },
        navigation: { nextStep: 'step_identity' },
        layout: [
          { id: 'email', type: 'email', label: { en: 'Personal Email', es: 'Correo Electrónico Personal' }, required: true },
          { id: 'confirmEmail', type: 'email', label: { en: 'Confirm Email', es: 'Confirmar Correo Electrónico' }, required: true },
          { id: 'emailOwnership', type: 'checkbox', label: { en: 'I confirm this email belongs to me', es: 'Confirmo que este correo me pertenece' }, required: true }
        ],
        fields: [
          { id: 'email', type: 'email', label: { en: 'Personal Email', es: 'Correo Electrónico Personal' }, required: true },
          { id: 'confirmEmail', type: 'email', label: { en: 'Confirm Email', es: 'Confirmar Correo Electrónico' }, required: true },
          { id: 'emailOwnership', type: 'checkbox', label: { en: 'I confirm this email belongs to me', es: 'Confirmo que este correo me pertenece' }, required: true }
        ]
      },
      {
        id: 'step_identity',
        title: { en: 'Identity Data', es: 'Datos de Identidad' },
        navigation: { nextStep: 'step_address' },
        layout: [
          { id: 'fullName', type: 'shortText', label: { en: 'Full Legal Name', es: 'Nombre Completo' }, required: true },
          { id: 'curp', type: 'shortText', label: { en: 'CURP / Government ID', es: 'CURP / Identificación Oficial' }, required: true },
          { id: 'birthDate', type: 'shortText', label: { en: 'Date of Birth (DD/MM/YYYY)', es: 'Fecha de Nacimiento (DD/MM/AAAA)' }, required: true }
        ],
        fields: [
          { id: 'fullName', type: 'shortText', label: { en: 'Full Legal Name', es: 'Nombre Completo' }, required: true },
          { id: 'curp', type: 'shortText', label: { en: 'CURP / Government ID', es: 'CURP / Identificación Oficial' }, required: true },
          { id: 'birthDate', type: 'shortText', label: { en: 'Date of Birth (DD/MM/YYYY)', es: 'Fecha de Nacimiento (DD/MM/AAAA)' }, required: true }
        ]
      },
      {
        id: 'step_address',
        title: { en: 'Address', es: 'Domicilio' },
        navigation: { nextStep: 'step_biometrics' },
        layout: [
          { id: 'zipCode', type: 'shortText', label: { en: 'ZIP Code', es: 'Código Postal' }, required: true },
          { id: 'street', type: 'shortText', label: { en: 'Street and Number', es: 'Calle y Número' }, required: true },
          { id: 'city', type: 'shortText', label: { en: 'City', es: 'Ciudad' }, required: true }
        ],
        fields: [
          { id: 'zipCode', type: 'shortText', label: { en: 'ZIP Code', es: 'Código Postal' }, required: true },
          { id: 'street', type: 'shortText', label: { en: 'Street and Number', es: 'Calle y Número' }, required: true },
          { id: 'city', type: 'shortText', label: { en: 'City', es: 'Ciudad' }, required: true }
        ]
      },
      {
        id: 'step_biometrics',
        title: { en: 'Biometrics', es: 'Biometría' },
        navigation: { nextStep: 'step_legales' },
        layout: [
          { id: 'idFront', type: 'imageDropzone', label: { en: 'Upload ID Front', es: 'Subir Frente de Identificación' }, required: true },
          { id: 'idBack', type: 'imageDropzone', label: { en: 'Upload ID Back', es: 'Subir Reverso de Identificación' }, required: true },
          { id: 'selfie', type: 'imageDropzone', label: { en: 'Take or Upload Selfie', es: 'Tomar o Subir Selfie' }, required: true }
        ],
        fields: [
          { id: 'idFront', type: 'imageDropzone', label: { en: 'Upload ID Front', es: 'Subir Frente de Identificación' }, required: true },
          { id: 'idBack', type: 'imageDropzone', label: { en: 'Upload ID Back', es: 'Subir Reverso de Identificación' }, required: true },
          { id: 'selfie', type: 'imageDropzone', label: { en: 'Take or Upload Selfie', es: 'Tomar o Subir Selfie' }, required: true }
        ]
      },
      {
        id: 'step_legales',
        title: { en: 'Legal Terms', es: 'Legales' },
        navigation: { nextStep: 'step_confirmation' },
        layout: [
          { id: 'privacyNotice', type: 'checkbox', label: { en: 'I accept the privacy notice', es: 'Acepto el aviso de privacidad' }, required: true },
          { id: 'terms', type: 'checkbox', label: { en: 'I accept terms and conditions', es: 'Acepto términos y condiciones' }, required: true },
          { id: 'dataConsent', type: 'checkbox', label: { en: 'I authorize identity validation', es: 'Autorizo validación de identidad' }, required: true }
        ],
        fields: [
          { id: 'privacyNotice', type: 'checkbox', label: { en: 'I accept the privacy notice', es: 'Acepto el aviso de privacidad' }, required: true },
          { id: 'terms', type: 'checkbox', label: { en: 'I accept terms and conditions', es: 'Acepto términos y condiciones' }, required: true },
          { id: 'dataConsent', type: 'checkbox', label: { en: 'I authorize identity validation', es: 'Autorizo validación de identidad' }, required: true }
        ]
      },
      {
        id: 'step_confirmation',
        title: { en: 'Confirmation', es: 'Confirmación' },
        navigation: { nextStep: null },
        layout: [
          { id: 'enrollmentMessage', type: 'message', label: { en: 'Your enrollment request is complete and in validation.', es: 'Tu solicitud de enrolamiento fue completada y está en validación.' }, required: false },
          { id: 'folio', type: 'shortText', label: { en: 'Reference Folio', es: 'Folio de Referencia' }, required: false, defaultValue: 'BROX-ENR-0001' }
        ],
        fields: [
          { id: 'enrollmentMessage', type: 'message', label: { en: 'Your enrollment request is complete and in validation.', es: 'Tu solicitud de enrolamiento fue completada y está en validación.' }, required: false },
          { id: 'folio', type: 'shortText', label: { en: 'Reference Folio', es: 'Folio de Referencia' }, required: false, defaultValue: 'BROX-ENR-0001' }
        ]
      }
    ]
  }
];
const submissions: FormSubmission[] = [];

export const mockBackendInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const { url, method, body } = req;

  return new Observable<HttpEvent<unknown>>((observer: Observer<HttpEvent<unknown>>) => {
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

      // GET /api/workflows/:id/fork
      if (url.match(/\/api\/workflows\/[^/]+\/fork$/) && method === 'POST') {
        const parts = url.split('/');
        const workflowId = parts[parts.length - 2];
        const original = workflows.find(w => w.id === workflowId);
        if (original) {
          const forked = { 
            ...original, 
            id: Date.now().toString(),
            name: typeof original.name === 'string' ? `${original.name} (Copy)` : { 
              en: `${(original.name as Record<string, string>)['en'] || ''} (Copy)`,
              es: `${(original.name as Record<string, string>)['es'] || ''} (Copia)`
            }
          };
          workflows.push(forked);
          observer.next(new HttpResponse({ status: 201, body: forked }));
        } else {
          observer.error(new HttpErrorResponse({ status: 404, statusText: 'Not Found', url }));
        }
        observer.complete();
        return;
      }

      // ============================================================================
      // Applications API (Phase 5)
      // ============================================================================

      // GET /api/applications
      if (url.endsWith('/api/applications') && method === 'GET') {
        const mockApps = [
          { id: 'app_1', organizationId: 'org_1', appKey: 'broxel_onboarding', name: 'Broxel Customer Onboarding', currentPublishedVersionId: 'ver_1' },
          { id: 'app_2', organizationId: 'org_1', appKey: 'merchant_onboarding', name: 'Merchant Onboarding', currentPublishedVersionId: null },
          { id: 'app_3', organizationId: 'org_1', appKey: 'wallet_onboarding', name: 'Wallet Activation Onboarding', currentPublishedVersionId: 'ver_3' }
        ];
        observer.next(new HttpResponse({ 
          status: 200, 
          body: { data: mockApps, total: mockApps.length, page: 1, pageSize: 10, totalPages: 1 } 
        }));
        observer.complete();
        return;
      }

      // ============================================================================
      // Workflow Instances API (Phase 5)
      // ============================================================================

      // GET /api/runtime/instances
      if (url.match(/\/api\/runtime\/instances(\?.*)?$/) && method === 'GET') {
        const mockInstances = [
          {
            id: 'inst_1',
            organizationId: 'org_1',
            applicationId: 'app_1',
            applicationVersionId: 'ver_1',
            workflowId: 'wf_1',
            currentNodeId: 'node_2',
            status: 'running',
            contextJson: { userId: 'user_123', step: 2 },
            startedAt: new Date(Date.now() - 3600000).toISOString(),
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
            currentNodeId: null,
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
            currentNodeId: 'node_1',
            status: 'pending',
            contextJson: {},
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            workflowName: 'Wallet Activation Onboarding',
            applicationName: 'Wallet Platform'
          }
        ];
        observer.next(new HttpResponse({ 
          status: 200, 
          body: { data: mockInstances, total: mockInstances.length, page: 1, pageSize: 10, totalPages: 1 } 
        }));
        observer.complete();
        return;
      }

      // GET /api/runtime/instances/:id
      if (url.match(/\/api\/runtime\/instances\/[^/]+$/) && method === 'GET') {
        const id = url.split('/').pop();
        observer.next(new HttpResponse({ 
          status: 200, 
          body: {
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
            workflowName: 'Broxel Customer Onboarding',
            currentNodeLabel: 'Legal Consent Review'
          }
        }));
        observer.complete();
        return;
      }

      // GET /api/runtime/instances/:id/submissions
      if (url.match(/\/api\/runtime\/instances\/[^/]+\/submissions$/) && method === 'GET') {
        observer.next(new HttpResponse({ 
          status: 200, 
          body: [
            {
              id: 'sub_1',
              organizationId: 'org_1',
              applicationId: 'app_1',
              status: 'completed',
              dataJson: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
              createdAt: new Date(Date.now() - 3500000).toISOString()
            }
          ]
        }));
        observer.complete();
        return;
      }

      // GET /api/runtime/instances/:id/logs
      if (url.match(/\/api\/runtime\/instances\/[^/]+\/logs$/) && method === 'GET') {
        observer.next(new HttpResponse({ 
          status: 200, 
          body: [
            {
              id: 'log_1',
              instanceId: 'inst_1',
              nodeId: 'node_1',
              action: 'Instance Started',
              previousStatus: 'pending',
              newStatus: 'running',
              contextSnapshot: {},
              createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'log_2',
              instanceId: 'inst_1',
              nodeId: 'node_1',
              action: 'Form Submitted',
              previousStatus: 'running',
              newStatus: 'running',
              contextSnapshot: { step: 1 },
              createdAt: new Date(Date.now() - 3500000).toISOString()
            }
          ]
        }));
        observer.complete();
        return;
      }

      // ============================================================================
      // Submissions API (Phase 5)
      // ============================================================================

      // GET /api/submissions
      if (url.match(/\/api\/submissions(\?.*)?$/) && method === 'GET') {
        observer.next(new HttpResponse({ 
          status: 200, 
          body: { data: submissions, total: submissions.length, page: 1, pageSize: 10, totalPages: 1 } 
        }));
        observer.complete();
        return;
      }

      // POST /api/submissions
      if (url.endsWith('/api/submissions') && method === 'POST') {
        const newSubmission: FormSubmission = {
          id: Date.now().toString(),
          workflowId: (body as Record<string, unknown>)['workflowId'] as string || '',
          data: (body as Record<string, unknown>)['dataJson'] as Record<string, unknown> || {},
          submittedAt: new Date().toISOString()
        };
        submissions.push(newSubmission);
        observer.next(new HttpResponse({ status: 201, body: { ...newSubmission, status: 'pending' } }));
        observer.complete();
        return;
      }

      // Pass through for any other requests
      next(req).subscribe({
        next: (event: HttpEvent<unknown>) => observer.next(event),
        error: (err: unknown) => observer.error(err),
        complete: () => observer.complete()
      });
    } catch {
      observer.error(new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error', url }));
    }
  });
};
