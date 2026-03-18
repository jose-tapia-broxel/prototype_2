import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WorkflowService } from './workflow.service';
import { WorkflowDefinition, FormSubmission, WorkflowStep } from './models/workflow.model';

/**
 * Workflow E2E Integration Tests
 * 
 * Tests the complete workflow lifecycle:
 * - Workflow creation → publishing flow
 * - Instance startup → form submission → completion
 * - Error scenarios
 * - Concurrent submissions
 */
describe('Workflow E2E Integration', () => {
  let service: WorkflowService;
  let httpMock: HttpTestingController;

  // ─────────────────────────────────────────────────────────────
  // TEST DATA FACTORIES
  // ─────────────────────────────────────────────────────────────

  const createMockWorkflow = (overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition => ({
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow for integration testing',
    category: 'test',
    totalSteps: 3,
    steps: [
      createMockStep({ id: 'step-1', title: 'Step 1' }),
      createMockStep({ id: 'step-2', title: 'Step 2' }),
      createMockStep({ id: 'step-3', title: 'Step 3' }),
    ],
    ...overrides,
  });

  const createMockStep = (overrides: Partial<WorkflowStep> = {}): WorkflowStep => ({
    id: 'step-default',
    title: 'Default Step',
    fields: [
      {
        id: 'field-1',
        type: 'shortText',
        label: 'Name',
        required: true,
        placeholder: 'Enter your name',
      },
      {
        id: 'field-2',
        type: 'email',
        label: 'Email',
        required: true,
        placeholder: 'Enter your email',
      },
    ],
    validationRules: [],
    navigation: { nextStep: null },
    ...overrides,
  });

  const createMockSubmission = (overrides: Partial<FormSubmission> = {}): FormSubmission => ({
    id: 'submission-1',
    workflowId: 'workflow-1',
    data: { name: 'John', email: 'john@example.com' },
    submittedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkflowService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(WorkflowService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW CREATION → PUBLISHING FLOW
  // ─────────────────────────────────────────────────────────────

  describe('Workflow Creation → Publishing Flow', () => {
    it('should create a new workflow with steps', fakeAsync(() => {
      const newWorkflow: Partial<WorkflowDefinition> = {
        name: 'New Workflow',
        description: 'Created via E2E test',
        steps: [createMockStep({ id: 'new-step-1', title: 'New Step' })],
      };

      let result: WorkflowDefinition | undefined;

      service.createWorkflow(newWorkflow).subscribe((response) => {
        result = response;
      });

      const req = httpMock.expectOne('/api/workflows');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newWorkflow);

      req.flush(createMockWorkflow({ ...newWorkflow, id: 'new-workflow-id' }));
      tick();

      expect(result).toBeDefined();
      expect(result!.id).toBe('new-workflow-id');
      expect(result!.name).toBe('New Workflow');
    }));

    it('should update existing workflow', fakeAsync(() => {
      const existingWorkflow = createMockWorkflow();
      const updatedWorkflow = { ...existingWorkflow, name: 'Updated Name' };

      let result: WorkflowDefinition | undefined;

      service.updateWorkflow(existingWorkflow.id, updatedWorkflow).subscribe((response) => {
        result = response;
      });

      const req = httpMock.expectOne(`/api/workflows/${existingWorkflow.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.name).toBe('Updated Name');

      req.flush(updatedWorkflow);
      tick();

      expect(result!.name).toBe('Updated Name');
    }));

    it('should complete full create → update → publish cycle', fakeAsync(() => {
      // Step 1: Create workflow
      const newWorkflow: Partial<WorkflowDefinition> = {
        name: 'Draft Workflow',
        description: 'Initial draft',
        steps: [],
      };

      let createdWorkflow: WorkflowDefinition | undefined;
      service.createWorkflow(newWorkflow).subscribe((r) => (createdWorkflow = r));

      const createReq = httpMock.expectOne('/api/workflows');
      createReq.flush(createMockWorkflow({ ...newWorkflow, id: 'draft-1' }));
      tick();

      expect(createdWorkflow!.id).toBe('draft-1');

      // Step 2: Add steps
      const workflowWithSteps: WorkflowDefinition = {
        ...createdWorkflow!,
        steps: [
          createMockStep({ id: 'step-1', title: 'Personal Info' }),
          createMockStep({ id: 'step-2', title: 'Review' }),
        ],
      };

      let updatedWorkflow: WorkflowDefinition | undefined;
      service.updateWorkflow(createdWorkflow!.id, workflowWithSteps).subscribe((r) => (updatedWorkflow = r));

      const updateReq = httpMock.expectOne(`/api/workflows/draft-1`);
      updateReq.flush(workflowWithSteps);
      tick();

      expect(updatedWorkflow!.steps.length).toBe(2);
    }));

    it('should handle workflow deletion', fakeAsync(() => {
      let deleted = false;

      service.deleteWorkflow('workflow-to-delete').subscribe(() => {
        deleted = true;
      });

      const req = httpMock.expectOne('/api/workflows/workflow-to-delete');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      tick();

      expect(deleted).toBe(true);
    }));

    it('should fork an existing workflow', fakeAsync(() => {
      const originalWorkflow = createMockWorkflow({ id: 'original-1' });
      const forkedWorkflow = createMockWorkflow({
        id: 'forked-1',
        name: 'Test Workflow (Copy)',
      });

      let result: WorkflowDefinition | undefined;

      service.forkWorkflow('original-1').subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/workflows/original-1/fork');
      expect(req.request.method).toBe('POST');
      req.flush(forkedWorkflow);
      tick();

      expect(result!.id).toBe('forked-1');
      expect(result!.name).toContain('Copy');
    }));
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW INSTANCE STARTUP → SUBMISSION → COMPLETION
  // ─────────────────────────────────────────────────────────────

  describe('Instance Startup → Form Submission → Completion', () => {
    it('should load workflow and prepare for submission', fakeAsync(() => {
      const workflow = createMockWorkflow();

      let loadedWorkflow: WorkflowDefinition | undefined;
      service.getWorkflow('workflow-1').subscribe((r) => (loadedWorkflow = r));

      const req = httpMock.expectOne('/api/workflows/workflow-1');
      req.flush(workflow);
      tick();

      expect(loadedWorkflow).toBeDefined();
      expect(loadedWorkflow!.steps.length).toBe(3);
      expect(loadedWorkflow!.steps[0].fields!.length).toBeGreaterThan(0);
    }));

    it('should submit form data successfully', fakeAsync(() => {
      const submissionData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      let submission: FormSubmission | undefined;
      service.submitWorkflow('workflow-1', submissionData).subscribe((r) => (submission = r));

      const req = httpMock.expectOne('/api/workflows/workflow-1/submissions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(submissionData);

      req.flush(createMockSubmission({ data: submissionData }));
      tick();

      expect(submission).toBeDefined();
      expect(submission!.data).toEqual(submissionData);
      expect(submission!.submittedAt).toBeDefined();
    }));

    it('should complete full workflow execution lifecycle', fakeAsync(() => {
      // Step 1: Load workflow
      let workflow: WorkflowDefinition | undefined;
      service.getWorkflow('workflow-1').subscribe((r) => (workflow = r));

      httpMock.expectOne('/api/workflows/workflow-1').flush(createMockWorkflow());
      tick();

      // Step 2: Submit Step 1
      const step1Data = { name: 'John', email: 'john@example.com' };
      let step1Submission: FormSubmission | undefined;
      service.submitWorkflow('workflow-1', { step: 1, ...step1Data }).subscribe((r) => (step1Submission = r));

      httpMock.expectOne('/api/workflows/workflow-1/submissions').flush(
        createMockSubmission({ id: 'sub-1', data: { step: 1, ...step1Data } })
      );
      tick();

      expect(step1Submission!.id).toBe('sub-1');

      // Step 3: Submit Step 2
      const step2Data = { answer: 'Yes', comments: 'Looking good' };
      let step2Submission: FormSubmission | undefined;
      service.submitWorkflow('workflow-1', { step: 2, ...step2Data }).subscribe((r) => (step2Submission = r));

      httpMock.expectOne('/api/workflows/workflow-1/submissions').flush(
        createMockSubmission({ id: 'sub-2', data: { step: 2, ...step2Data } })
      );
      tick();

      expect(step2Submission!.id).toBe('sub-2');

      // Step 4: Final submission (complete workflow)
      const finalData = { confirmed: true };
      let finalSubmission: FormSubmission | undefined;
      service.submitWorkflow('workflow-1', { step: 3, ...finalData, _complete: true }).subscribe((r) => (finalSubmission = r));

      httpMock.expectOne('/api/workflows/workflow-1/submissions').flush(
        createMockSubmission({ id: 'sub-final', data: { step: 3, ...finalData, _complete: true } })
      );
      tick();

      expect(finalSubmission!.id).toBe('sub-final');
    }));

    it('should retrieve submission history', fakeAsync(() => {
      const submissions = [
        createMockSubmission({ id: 'sub-1' }),
        createMockSubmission({ id: 'sub-2' }),
        createMockSubmission({ id: 'sub-3' }),
      ];

      let result: FormSubmission[] | undefined;
      service.getSubmissions('workflow-1').subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/workflows/workflow-1/submissions');
      req.flush(submissions);
      tick();

      expect(result!.length).toBe(3);
    }));
  });

  // ─────────────────────────────────────────────────────────────
  // ERROR SCENARIOS
  // ─────────────────────────────────────────────────────────────

  describe('Error Scenarios', () => {
    it('should handle workflow not found (404)', fakeAsync(() => {
      let error: any;

      service.getWorkflow('non-existent').subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows/non-existent');
      req.flush({ message: 'Workflow not found' }, { status: 404, statusText: 'Not Found' });
      tick();

      expect(error).toBeDefined();
      expect(error.status).toBe(404);
    }));

    it('should handle validation errors on submission (400)', fakeAsync(() => {
      let error: any;

      service.submitWorkflow('workflow-1', { invalid: true }).subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows/workflow-1/submissions');
      req.flush(
        {
          message: 'Validation failed',
          errors: [
            { field: 'name', message: 'Name is required' },
            { field: 'email', message: 'Invalid email format' },
          ],
        },
        { status: 400, statusText: 'Bad Request' }
      );
      tick();

      expect(error).toBeDefined();
      expect(error.status).toBe(400);
      expect(error.error.errors).toHaveLength(2);
    }));

    it('should handle server errors (500)', fakeAsync(() => {
      let error: any;

      service.createWorkflow({ name: 'Test' }).subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows');
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
      tick();

      expect(error).toBeDefined();
      expect(error.status).toBe(500);
    }));

    it('should handle unauthorized access (401)', fakeAsync(() => {
      let error: any;

      service.getWorkflows().subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(error).toBeDefined();
      expect(error.status).toBe(401);
    }));

    it('should handle forbidden access (403)', fakeAsync(() => {
      let error: any;

      service.updateWorkflow('workflow-1', createMockWorkflow()).subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows/workflow-1');
      req.flush({ message: 'Forbidden - insufficient permissions' }, { status: 403, statusText: 'Forbidden' });
      tick();

      expect(error).toBeDefined();
      expect(error.status).toBe(403);
    }));

    it('should handle network timeout', fakeAsync(() => {
      let error: any;

      service.getWorkflows().subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows');
      req.error(new ProgressEvent('timeout'));
      tick();

      expect(error).toBeDefined();
    }));

    it('should handle conflict on concurrent modification (409)', fakeAsync(() => {
      let error: any;

      service.updateWorkflow('workflow-1', createMockWorkflow()).subscribe({
        error: (e) => (error = e),
      });

      const req = httpMock.expectOne('/api/workflows/workflow-1');
      req.flush(
        { message: 'Conflict - workflow was modified by another user' },
        { status: 409, statusText: 'Conflict' }
      );
      tick();

      expect(error).toBeDefined();
      expect(error.status).toBe(409);
    }));
  });

  // ─────────────────────────────────────────────────────────────
  // CONCURRENT SUBMISSIONS
  // ─────────────────────────────────────────────────────────────

  describe('Concurrent Submissions', () => {
    it('should handle multiple simultaneous submissions', fakeAsync(() => {
      const submissions: FormSubmission[] = [];

      // Fire 3 concurrent submissions
      service.submitWorkflow('workflow-1', { user: 'A' }).subscribe((r) => submissions.push(r));
      service.submitWorkflow('workflow-1', { user: 'B' }).subscribe((r) => submissions.push(r));
      service.submitWorkflow('workflow-1', { user: 'C' }).subscribe((r) => submissions.push(r));

      // All 3 requests should be pending
      const requests = httpMock.match('/api/workflows/workflow-1/submissions');
      expect(requests.length).toBe(3);

      // Respond to all
      requests[0].flush(createMockSubmission({ id: 'sub-A' }));
      requests[1].flush(createMockSubmission({ id: 'sub-B' }));
      requests[2].flush(createMockSubmission({ id: 'sub-C' }));
      tick();

      expect(submissions).toHaveLength(3);
      expect(submissions.map((s) => s.id)).toEqual(['sub-A', 'sub-B', 'sub-C']);
    }));

    it('should handle race condition - one fails, others succeed', fakeAsync(() => {
      const results: Array<{ success: boolean; id?: string; error?: any }> = [];

      service.submitWorkflow('workflow-1', { user: 'A' }).subscribe({
        next: (r) => results.push({ success: true, id: r.id }),
        error: (e) => results.push({ success: false, error: e }),
      });
      service.submitWorkflow('workflow-1', { user: 'B' }).subscribe({
        next: (r) => results.push({ success: true, id: r.id }),
        error: (e) => results.push({ success: false, error: e }),
      });
      service.submitWorkflow('workflow-1', { user: 'C' }).subscribe({
        next: (r) => results.push({ success: true, id: r.id }),
        error: (e) => results.push({ success: false, error: e }),
      });

      const requests = httpMock.match('/api/workflows/workflow-1/submissions');

      requests[0].flush(createMockSubmission({ id: 'sub-A' }));
      requests[1].flush({ message: 'Rate limited' }, { status: 429, statusText: 'Too Many Requests' });
      requests[2].flush(createMockSubmission({ id: 'sub-C' }));
      tick();

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes).toHaveLength(2);
      expect(failures).toHaveLength(1);
      expect(failures[0].error.status).toBe(429);
    }));

    it('should maintain order of concurrent reads', fakeAsync(() => {
      const workflows: WorkflowDefinition[] = [];

      // Fire concurrent reads
      service.getWorkflow('workflow-1').subscribe((w) => workflows.push(w));
      service.getWorkflow('workflow-2').subscribe((w) => workflows.push(w));
      service.getWorkflow('workflow-3').subscribe((w) => workflows.push(w));

      const req1 = httpMock.expectOne('/api/workflows/workflow-1');
      const req2 = httpMock.expectOne('/api/workflows/workflow-2');
      const req3 = httpMock.expectOne('/api/workflows/workflow-3');

      // Respond in reverse order
      req3.flush(createMockWorkflow({ id: 'workflow-3' }));
      req1.flush(createMockWorkflow({ id: 'workflow-1' }));
      req2.flush(createMockWorkflow({ id: 'workflow-2' }));
      tick();

      // All should complete regardless of response order
      expect(workflows.map((w) => w.id).sort()).toEqual(['workflow-1', 'workflow-2', 'workflow-3']);
    }));

    it('should handle rapid sequential submissions', fakeAsync(() => {
      const results: FormSubmission[] = [];

      // Rapid fire submissions
      for (let i = 0; i < 10; i++) {
        service.submitWorkflow('workflow-1', { sequence: i }).subscribe((r) => results.push(r));
      }

      const requests = httpMock.match('/api/workflows/workflow-1/submissions');
      expect(requests.length).toBe(10);

      // Respond to all
      requests.forEach((req, index) => {
        req.flush(createMockSubmission({ id: `sub-${index}`, data: { sequence: index } }));
      });
      tick();

      expect(results).toHaveLength(10);
    }));
  });

  // ─────────────────────────────────────────────────────────────
  // LIST AND PAGINATION
  // ─────────────────────────────────────────────────────────────

  describe('Workflow Listing', () => {
    it('should retrieve all workflows', fakeAsync(() => {
      const workflows = [
        createMockWorkflow({ id: 'wf-1', name: 'Workflow 1' }),
        createMockWorkflow({ id: 'wf-2', name: 'Workflow 2' }),
        createMockWorkflow({ id: 'wf-3', name: 'Workflow 3' }),
      ];

      let result: WorkflowDefinition[] | undefined;
      service.getWorkflows().subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/workflows');
      req.flush(workflows);
      tick();

      expect(result).toHaveLength(3);
      expect(result!.map((w) => w.id)).toEqual(['wf-1', 'wf-2', 'wf-3']);
    }));

    it('should handle empty workflow list', fakeAsync(() => {
      let result: WorkflowDefinition[] | undefined;
      service.getWorkflows().subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/workflows');
      req.flush([]);
      tick();

      expect(result).toHaveLength(0);
    }));
  });
});
