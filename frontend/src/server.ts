import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());
const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['localhost', '127.0.0.1', '10.100.8.56', '172.31.48.1']
});

// --- In-Memory Database ---
type FieldType = 'shortText' | 'longText' | 'number' | 'email' | 'dropdown' | 'checkbox' | 'password' | 'ssoLogin' | 'message' | 'container' | 'text' | 'textarea' | 'select' | 'carousel' | 'button' | 'effect' | 'imageDropzone' | 'drawing';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
  defaultValue?: string | boolean | number;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
}

interface WorkflowAction {
  action: 'validateFields' | 'setVariable' | 'callService' | 'ssoLogin' | 'ifCondition' | 'navigateToStep' | 'showMessage' | 'delay';
  target?: string;
  message?: string;
}

interface WorkflowLifecycle {
  beforeRender?: WorkflowAction[];
  onRender?: WorkflowAction[];
  afterRender?: WorkflowAction[];
  beforeSubmit?: WorkflowAction[];
  onSubmit?: WorkflowAction[];
  onSuccess?: WorkflowAction[];
  onError?: WorkflowAction[];
}

interface WorkflowNavigation {
  nextStep?: string | null;
}

interface WorkflowValidationRule {
  fieldId: string;
  rule: string;
  errorMessage: string;
}

interface WorkflowStep {
  id: string;
  title: string;
  layout?: FormField[];
  fields?: FormField[]; // Keep for backwards compatibility
  bindings?: Record<string, string>;
  validationRules?: WorkflowValidationRule[];
  lifecycle?: WorkflowLifecycle;
  navigation?: WorkflowNavigation;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  stateCode?: string;
}

interface WorkflowDefinition {
  id: string;
  name?: string;
  description: string;
  category?: string;
  totalSteps?: number;
  successPath?: string;
  errorHandlingPath?: string;
  notes?: string;
  steps: WorkflowStep[];
}

interface FormSubmission {
  id: string;
  workflowId: string;
  data: Record<string, unknown>;
  submittedAt: string;
}

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

// --- API Endpoints ---
app.get('/api/workflows', (req, res) => {
  res.json(workflows);
});

app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.find(w => w.id === req.params.id);
  if (workflow) {
    res.json(workflow);
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.post('/api/workflows', (req, res) => {
  const newWorkflow: WorkflowDefinition = {
    ...req.body,
    id: Date.now().toString()
  };
  workflows.push(newWorkflow);
  res.status(201).json(newWorkflow);
});

app.put('/api/workflows/:id', (req, res) => {
  const index = workflows.findIndex(w => w.id === req.params.id);
  if (index !== -1) {
    workflows[index] = { ...req.body, id: req.params.id };
    res.json(workflows[index]);
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.delete('/api/workflows/:id', (req, res) => {
  workflows = workflows.filter(w => w.id !== req.params.id);
  res.status(204).send();
});

app.post('/api/workflows/:id/fork', (req, res) => {
  const workflow = workflows.find(w => w.id === req.params.id);
  if (workflow) {
    const forkedWorkflow: WorkflowDefinition = {
      ...workflow,
      id: Date.now().toString(),
      name: `${workflow.name} (Copy)`
    };
    workflows.push(forkedWorkflow);
    res.status(201).json(forkedWorkflow);
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.post('/api/workflows/:id/submissions', (req, res) => {
  const submission: FormSubmission = {
    id: Date.now().toString(),
    workflowId: req.params.id,
    data: req.body,
    submittedAt: new Date().toISOString()
  };
  submissions.push(submission);
  res.status(201).json(submission);
});

app.get('/api/workflows/:id/submissions', (req, res) => {
  const workflowSubmissions = submissions.filter(s => s.workflowId === req.params.id);
  res.json(workflowSubmissions);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
