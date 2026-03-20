# Low-Code Workflow Automation Platform - Complete Documentation

**Last Updated:** March 2026  
**Version:** 0.1.0  
**Platform:** Multi-Tenant Workflow Automation System

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Backend Structure](#backend-structure)
6. [Frontend Structure](#frontend-structure)
7. [Database Schema](#database-schema)
8. [Key Concepts & Terminology](#key-concepts--terminology)
9. [Development Setup](#development-setup)
10. [API Routes & Endpoints](#api-routes--endpoints)
11. [Authentication & Authorization](#authentication--authorization)
12. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
13. [Workflow Execution Model](#workflow-execution-model)
14. [Rule Engine](#rule-engine)
15. [Data Flow Diagrams](#data-flow-diagrams)
16. [Common Patterns](#common-patterns)
17. [Contributing Guidelines](#contributing-guidelines)
18. [Deployment Notes](#deployment-notes)

---

## Project Overview

This is a **low-code workflow automation platform** that enables organizations to design, build, and execute complex business processes without writing code. Users can:

- **Define workflows** visually with drag-and-drop workflow builder
- **Create forms** for data collection with built-in validation
- **Design screens** for rich UI presentations
- **Define business rules** with a rule engine for conditional logic
- **Execute workflows** with multi-step processing
- **Track submissions** through the entire workflow lifecycle
- **Monitor telemetry** and gather insights about workflow performance

### Key Characteristics

- **Multi-Tenant**: Supports multiple organizations using the same platform
- **Role-Based Access Control (RBAC)**: Owner, Admin, Editor, Viewer roles
- **Event-Driven**: Workflows and rules respond to domain events
- **Immutable Versioning**: Application versions are snapshots, never mutated after publishing
- **Low-Code**: Visual builders for workflows, forms, rules, and screens
- **Observable**: Comprehensive telemetry and execution logs

---

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Angular)                      │
│  Workflow Builder | Form Designer | Dashboard | Renderer   │
└────────────┬──────────────────────────────────┬─────────────┘
             │                                  │
        Design APIs                      Execution APIs
             │                                  │
┌────────────┴──────────────────────────────────┴─────────────┐
│                  Backend (NestJS)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Controller Layer (REST v1/*)                     │   │
│  │  - Applications | Workflows | Rules | Submissions   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Domain Services (Business Logic)                     │   │
│  │  - WorkflowsService | RulesService | RuntimeService│   │
│  │  - ValidationService | TelemetryService              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Infrastructure Layer                                 │   │
│  │  - Database (TypeORM/PostgreSQL)                    │   │
│  │  - Event Bus                                         │   │
│  │  - Workers (Background Jobs)                         │   │
│  │  - Authentication (JWT/Passport)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            PostgreSQL 14+ Database                          │
│  15 Tables: Organizations, Applications, Workflows, Rules, │
│  Forms, Screens, Components, Instances, Submissions, etc.  │
└─────────────────────────────────────────────────────────────┘
```

### Operation Modes

#### 1. **Authoring Mode (Design-Time)**
Users design applications containing:
- Workflows (visual flowcharts)
- Forms (data collection schemas)
- Screens (UI layouts)
- Rules (conditional logic)

Each save creates a draft. Publishing creates an immutable `ApplicationVersion` snapshot.

#### 2. **Runtime Mode (Execution-Time)**
- Workflow instances execute based on published `ApplicationVersion`
- Users submit data through forms
- Rules engine evaluates conditions and actions
- Execution logs record every state change
- Telemetry events capture analytics

---

## Technology Stack

### Backend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | NestJS | 11.x | Node.js framework for scalable APIs |
| Language | TypeScript | 5.6.x | Static typing for JavaScript |
| Database | PostgreSQL | 14+ | Relational database |
| ORM | TypeORM | 0.3.x | Database abstraction & migrations |
| Authentication | Passport.js | 0.7.x | JWT-based auth strategy |
| Validation | class-validator | 0.14.x | DTO validation via decorators |
| Transformation | class-transformer | 0.5.x | Plain object to DTO conversion |
| Testing | Jest | 29.x | Unit & integration tests |

### Frontend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Angular | 21.x | TypeScript web framework |
| Language | TypeScript | 5.9.x | Static typing for JavaScript |
| Router | Angular Router | 21.x | Client-side routing |
| Forms | Angular Forms | 21.x | Reactive & template-driven forms |
| State | RxJS | ~7.8.x | Reactive programming & observables |
| UI Component Library | Angular Material | 21.x | Pre-built Material Design components |
| CDK | Angular CDK | 21.x | Component Dev Kit for advanced features |
| Styling | Tailwind CSS | 4.x | Utility-first CSS framework |
| AI Integration | Google GenAI | ^1.27.0 | AI/ML capabilities (Gemini API) |
| SSR | Angular SSR | 21.x | Server-side rendering |
| Build System | Vite/Webpack | (via Angular CLI) | Module bundling |

### DevOps & CI/CD
- **Package Manager**: npm
- **Linting**: ESLint
- **Code Format**: Prettier (implied)
- **Testing**: Jest (backend), Vitest (frontend)
- **Deployment**: Vercel (frontend), Custom (backend)

---

## Project Structure

```
workflow_builder/
├── backend/                          # NestJS application
│   ├── src/
│   │   ├── main.ts                   # Application entry point
│   │   ├── app.module.ts             # Root module
│   │   ├── common/                   # Shared utilities
│   │   │   ├── constants/            # App constants
│   │   │   ├── decorators/           # Custom decorators (@CurrentUser, @Roles, etc)
│   │   │   ├── guards/               # Route guards (JWT, RBAC)
│   │   │   └── interceptors/         # HTTP interceptors (tenants, etc)
│   │   ├── infrastructure/           # Cross-cutting concerns
│   │   │   ├── database/             # TypeORM config, migrations, schema docs
│   │   │   └── mock-data/            # Seed data provider
│   │   └── modules/                  # Domain modules (see detail below)
│   ├── jest.config.js                # Jest test configuration
│   ├── tsconfig.json                 # TypeScript config
│   ├── nest-cli.json                 # NestJS CLI config
│   └── package.json                  # Dependencies
│
├── frontend/                         # Angular application
│   ├── src/
│   │   ├── main.ts                   # Bootstrap entry point
│   │   ├── main.server.ts            # SSR entry point
│   │   ├── index.html                # HTML template
│   │   ├── styles.css                # Global styles
│   │   ├── app/                      # Application features (see detail below)
│   │   ├── core/                     # Core services & utilities
│   │   │   ├── auth/                 # Authentication services
│   │   │   ├── api/                  # API client services
│   │   │   ├── interceptors/         # HTTP interceptors
│   │   │   ├── integrations/         # External API integrations
│   │   │   ├── rule-engine/          # Rule evaluation logic
│   │   │   ├── security/             # Security utilities
│   │   │   ├── telemetry/            # Analytics & tracking
│   │   │   ├── orchestrator/         # Workflow orchestration
│   │   │   ├── plugins/              # Plugin system
│   │   │   └── explainability/       # AI explanations
│   │   └── environments/             # Environment configs
│   ├── angular.json                  # Angular CLI config
│   ├── tsconfig.json                 # TypeScript config
│   ├── tailwind.config.js            # Tailwind CSS config
│   └── package.json                  # Dependencies
│
├── .github/
│   └── agents/
│       └── lowcodeAgent.agent.md     # Agent persona for Copilot
│
└── package.json                      # Monorepo root config (if used)
```

---

## Backend Structure

### Modules Overview

The backend is organized into **14 domain modules**, each responsible for a specific business capability:

#### 1. **Auth Module** (`modules/auth/`)
**Purpose**: Authentication and JWT token management  
**Key Files**:
- `auth.service.ts` - Login, token generation, validation
- `jwt.strategy.ts` - Passport JWT strategy
- `auth.controller.ts` - POST /v1/auth/login

**Key Features**:
- JWT token generation
- Credential validation
- Session management
- Integration with Passport.js

---

#### 2. **Applications Module** (`modules/applications/`)
**Purpose**: Manage low-code applications and their versions  
**Entities**:
- `Application` - Core app entity
- `ApplicationVersion` - Immutable snapshots

**Key Services**:
- `ApplicationsService` - CRUD operations
- `AppVersioningService` - Version management
- `AppValidationService` - Application validation

**Key Features**:
- Create, read, update, delete applications
- Version management (draft → published)
- Archive functionality
- Immutable version snapshots

**API Endpoints** (REST v1/):
```
GET    /applications                 # List all apps in org
POST   /applications                 # Create new app
GET    /applications/:id             # Get app details
PUT    /applications/:id             # Update app
DELETE /applications/:id             # Archive app
GET    /applications/:id/versions    # List versions
POST   /applications/:id/versions    # Publish new version
```

**DTO Objects**:
- `CreateApplicationDto` - New app input
- `UpdateApplicationDto` - App updates
- `CreateVersionDto` - Version publish input

---

#### 3. **Workflows Module** (`modules/workflows/`)
**Purpose**: Workflow definition and node/transition management  
**Entities**:
- `Workflow` - Workflow container
- `WorkflowNode` - Individual steps/states
- `WorkflowTransition` - Edges between nodes

**Key Services**:
- `WorkflowsService` - Core CRUD
- `WorkflowValidationService` - Graph validation
- `DefinitionBuilderService` - Building workflow definitions

**Key Features**:
- Create visual workflows with nodes
- Define transitions with conditions
- Graph validation (no cycles, connected paths)
- Canvas position tracking (position_x, position_y)

**API Endpoints**:
```
GET    /workflows                    # List workflows in app
POST   /workflows                    # Create workflow
GET    /workflows/:id                # Get workflow details
PUT    /workflows/:id                # Update workflow
DELETE /workflows/:id                # Delete workflow
GET    /workflows/:id/nodes          # List nodes in workflow
POST   /workflows/:id/transitions    # Create transition
```

**Node Types**:
- `start` - Entry point
- `end` - Exit point
- `form` - Form submission node
- `screen` - Display screen
- `decision` - Conditional branching
- `action` - Automated action (API call, email, etc)
- `wait` - Pause execution
- `parallel` - Parallel execution
- `sub_workflow` - Nested workflow execution

---

#### 4. **Definitions Module** (`modules/definitions/`)
**Purpose**: Application definition composition (workflows + forms + rules + screens)  
**Key Services**:
- `DefinitionsService` - Compose full application definition
- `DefinitionValidationService` - Validate definition structure

**Key Features**:
- Aggregate all components into single app definition
- Validation before publishing
- Definition hash calculation (SHA-256)

---

#### 5. **Rules Module** (`modules/rules/`)
**Purpose**: Business rule definition and management  
**Entities**:
- `Rule` - Rule definition with conditions and actions

**Key Services**:
- `RulesService` - CRUD operations
- `RuleEvaluationService` - Evaluate rules at runtime
- `RuleEngineService` - Integration with runtime

**Key Features**:
- Define conditional rules
- Actions: route, notify, calculate, validate
- Priority-based evaluation
- Enable/disable toggle

**Rule Types**:
- `condition` - Boolean condition check
- `validation` - Input validation
- `calculation` - Computed values
- `routing` - Direct workflow navigation

**Rule Conditions** (stored as JSONB):
```json
{
  "type": "and|or|not",
  "conditions": [
    {
      "field": "age",
      "operator": ">=|<=|=|!=|in|contains",
      "value": 18
    }
  ]
}
```

**Rule Actions**:
```json
{
  "type": "route|notify|calculate|validate",
  "payload": { /* type-specific data */ }
}
```

**API Endpoints**:
```
GET    /rules                        # List rules in app
POST   /rules                        # Create rule
GET    /rules/:id                    # Get rule details
PUT    /rules/:id                    # Update rule
DELETE /rules/:id                    # Delete rule
```

---

#### 6. **Runtime Module** (`modules/runtime/`)
**Purpose**: Workflow execution engine and workflow instance management  
**Entities**:
- `WorkflowInstance` - Running workflow execution

**Key Services**:
- `RuntimeService` - Core execution engine
- `ExecutionContextService` - Track runtime state
- `WorkflowExecutorService` - Node and transition executor
- `TransitionEvaluationService` - Condition evaluation

**Key Features**:
- Start workflow instances
- Execute nodes and transitions
- Evaluate routing conditions
- Pause/resume execution
- Handle errors and failed states
- Track execution context (variables, history)

**Workflow Instance States**:
```
pending → running → completed
        ↓           ↓
      paused       failed
        ↓           ↓
      running    cancelled
```

**API Endpoints**:
```
POST   /runtime/instances            # Create workflow instance
GET    /runtime/instances            # List instances
GET    /runtime/instances/:id        # Get instance details
PUT    /runtime/instances/:id        # Update instance (pause, resume, cancel)
POST   /runtime/instances/:id/execute # Execute next step
```

---

#### 7. **Submissions Module** (`modules/submissions/`)
**Purpose**: Handle form submissions and submission processing  
**Entities**:
- `Submission` - User form submission record

**Key Services**:
- `SubmissionsService` - CRUD operations
- `SubmissionValidationService` - Schema validation
- `SubmissionProcessingService` - Process submissions through rules

**Key Features**:
- Accept form submissions
- Validate against form schema
- Store submission data
- Process submissions (apply rules, update workflow context)
- Track submission status

**Submission Status Lifecycle**:
```
pending → processing → completed
                     → failed
                     → rejected
```

**API Endpoints**:
```
POST   /submissions                  # Submit form
GET    /submissions                  # List submissions (org-wide)
GET    /submissions/:id              # Get submission details
PUT    /submissions/:id              # Update submission status
```

---

#### 8. **Credentials Module** (`modules/credentials/`)
**Purpose**: Manage API credentials for integrations  
**Key Services**:
- `CredentialsService` - Store and retrieve API tokens
- `CredentialEncryptionService` - Secure credential storage

**Key Features**:
- Store and manage API tokens
- Credential encryption at rest
- Associating credentials with integrations

---

#### 9. **Integrations Module** (`modules/integrations/`)
**Purpose**: External API integrations and webhooks  
**Key Services**:
- `IntegrationsService` - Integration configuration
- `IntegrationExecutorService` - Execute API calls
- `WebhookService` - Incoming webhooks

**Key Features**:
- HTTP request execution from workflows
- Request/response transformation
- Webhook support for external triggers
- Error handling and retries

**Supported Integrations**:
- HTTP REST APIs
- Database queries
- Email/SMS services
- Webhook endpoints

---

#### 10. **Events Module** (`modules/events/`)
**Purpose**: Event-driven architecture and event bus  
**Key Services**:
- `EventsService` - Publish domain events
- `EventBusService` - Subscribe and emit events

**Key Events**:
```
- ApplicationPublished
- WorkflowInstanceStarted
- WorkflowInstanceCompleted
- WorkflowInstanceFailed
- SubmissionCreated
- SubmissionProcessed
- RuleEvaluated
- NodeEntered
- NodeExited
- TransitionTaken
```

**Pattern**: Event-driven triggers for workflow progression, rule evaluation, telemetry

---

#### 11. **Telemetry Module** (`modules/telemetry/`)
**Purpose**: Analytics, monitoring, and observability  
**Entities**:
- `TelemetryEvent` - Analytics event record
- `WorkflowExecutionLog` - Execution audit trail

**Key Services**:
- `TelemetryService` - Event tracking
- `PerformanceMonitoringService` - Performance metrics
- `AuditLogService` - Immutable execution logs

**Key Features**:
- Track application analytics
- Record execution logs
- Performance metrics (duration, errors, throughput)
- Audit trails for compliance

**Event Categories**:
```
- workflow - Workflow-related events
- submission - Submission processing
- rule - Rule evaluation
- user_action - User interactions
- system - System events
- error - Error events
```

**API Endpoints**:
```
GET    /telemetry/events             # List telemetry events
GET    /telemetry/analytics          # Dashboard analytics
```

---

#### 12. **Workers Module** (`modules/workers/`)
**Purpose**: Background job processing  
**Key Services**:
- `BackgroundJobService` - Job scheduling
- `WorkerService` - Job execution

**Key Features**:
- Process submissions asynchronously
- Handle long-running operations
- Retry failed jobs
- Job queue management

---

#### 13. **IAM Module** (`modules/iam/`)
**Purpose**: Identity and Access Management  
**Key Features**:
- User roles (owner, admin, editor, viewer)
- Permission checks
- Tenant isolation

---

#### 14. **Organizations Module** (`modules/organizations/`)
**Purpose**: Tenant (organization) management  
**Entities**:
- `Organization` - Tenant root
- `User` - Scoped to organization

**Key Services**:
- `OrganizationsService` - Org management
- `UsersService` - User management

**Key Features**:
- Create/manage organizations
- User invitations and team management
- Organization-level settings
- Tenant isolation enforcement

---

### Common Module Elements

Every module follows this structure:

```
module/
├── MODULE.NAME.module.ts    # Module definition
├── controllers/             # HTTP endpoints
│   └── MODULE.controller.ts
├── services/                # Business logic
│   ├── MODULE.service.ts
│   └── MODULE-specific.service.ts
├── dto/                      # Data Transfer Objects
│   ├── create-MODULE.dto.ts
│   ├── update-MODULE.dto.ts
│   └── ...
├── entities/                 # Database entities
│   └── MODULE.entity.ts
├── interfaces/               # TypeScript interfaces
├── guards/                   # Route guards (if needed)
└── tests/                    # Unit & integration tests
```

---

## Frontend Structure

### Features Overview

The frontend is organized into **12 feature modules**, each representing a major user capability:

#### 1. **Builder** (`app/builder/`)
**Purpose**: Visual workflow builder interface  
**Key Components**:
- `workflow-builder.component.ts` - Main builder canvas
- `workflow-wizard.component.ts` - Step-by-step workflow creation
- `natural-rule-builder.component.ts` - AI-powered rule builder

**Key Features**:
- Drag-and-drop node placement
- Visual workflow graph editing
- Node configuration panels
- Transition definition with conditions
- Real-time canvas rendering
- UX level switching (simple/advanced/developer)

**Key Services**:
- `WorkflowService` - Workflow data management
- `UxLevelService` - Interface complexity control
- `NL-WorkflowService` - Natural language processing

---

#### 2. **Dashboard** (`app/dashboard/`)
**Purpose**: Main application dashboard and overview  
**Key Components**:
- `dashboard.component.ts` - Analytics and quick access

**Key Features**:
- Application overview
- Quick statistics
- Recent activities
- Navigation hub

---

#### 3. **Business Insights** (`app/business-insights/`)
**Purpose**: Analytics and business intelligence  
**Key Components**:
- `business-insights.component.ts` - Analytics dashboard

**Key Features**:
- Performance metrics
- Workflow execution statistics
- Submission analytics
- Rule evaluation results
- User behavior tracking

---

#### 4. **Integrations** (`app/integrations/`)
**Purpose**: External API integrations configuration  
**Key Components**:
- `integration-marketplace.component.ts` - Browse available integrations
- `integration-config-panel.component.ts` - Configure integration
- `api-call-config.component.ts` - Configure API calls
- `cache-config.component.ts` - Cache settings
- `field-mapping.component.ts` - Map response fields

**Key Services**:
- `IntegrationService` - Integration management

**Key Features**:
- Browse integration marketplace
- Configure API endpoints
- Authentication setup
- Request/response mapping
- Field transformation

---

#### 5. **Renderer** (`app/renderer/`)
**Purpose**: Runtime workflow rendering for end users  
**Key Components**:
- `workflow-renderer.component.ts` - Render and execute workflows

**Key Features**:
- Display workflows to end users
- Render forms and screens
- Handle form submissions
- Show workflow progress
- Error handling

---

#### 6. **Instance** (`app/instance/`)
**Purpose**: Workflow instance viewing and management  
**Key Components**:
- `instance-viewer.component.ts` - View running instances

**Key Features**:
- View instance details
- Track execution progress
- View execution logs
- Manual instance controls (pause, resume, cancel)

---

#### 7. **Wizard** (`app/wizard/`)
**Purpose**: Step-by-step guided workflows  
**Key Components**:
- Various wizard components for guided UX

**Key Features**:
- Guided workflow creation
- Step validation
- Progress indication
- Smart defaults

---

#### 8. **Components** (`app/components/`)
**Purpose**: Reusable UI components  
**Key Components**:
- `submission-status.component.ts` - Display submission status

**Key Features**:
- Shared component library
- Material Design integration
- Status indicators
- Form elements

---

#### 9. **Models** (`app/models/`)
**Purpose**: TypeScript models and interfaces  
**Key Models**:
- `workflow.model.ts` - Workflow model interfaces
- `api.model.ts` - API response models

---

#### 10. **Plugins** (`app/plugins/`)
**Purpose**: Plugin system for extensibility  
**Key Plugins**:
- `short-text.plugin.ts` - Text input field

**Pattern**: Plugin-based architecture for form fields and components

---

#### 11. **Shared** (`app/shared/`)
**Purpose**: Shared utilities and components  
**Key Components**:
- `monaco-code-editor.component.ts` - Code editor for JSON/expressions

**Key Features**:
- Code editor integration
- Shared utilities
- Formatting helpers

---

#### 12. **Core** (`core/`)
**Purpose**: Core application services and infrastructure  
**Key Subdirectories**:

##### `auth/`
- Authentication logic
- Token management
- Login/logout

##### `api/`
- HTTP client services
- API endpoints configuration
- Data fetching

##### `interceptors/`
- HTTP request/response interceptors
- Error handling
- Token injection

##### `integrations/`
- External API client services
- Webhook handling
- Third-party SDK integration

##### `orchestrator/`
- Workflow orchestration logic
- Execution state management
- Workflow progression

##### `plugins/`
- Plugin loading and management
- Plugin registry
- Runtime plugin execution

##### `rule-engine/`
- Rule evaluation logic
- Condition checking
- Action execution

##### `security/`
- XSS protection
- CSRF tokens
- Secure storage

##### `telemetry/`
- Analytics tracking
- Event recording
- Performance monitoring

##### `explainability/`
- AI explanations
- Decision explanations
- Feature importance

---

### Key Services

#### `app.service.ts` (Root Service)
- Application-level orchestration
- Global state management

#### `workflow.service.ts`
- Workflow CRUD operations
- Workflow execution management
- Integration with backend

#### `nl-workflow.service.ts`
- Natural language processing
- AI-powered workflow generation
- Rule suggestions

#### `language.service.ts`
- Internationalization (i18n)
- Translation management
- Multi-language support

#### `ux-level.service.ts`
- User experience level (simple/advanced/developer)
- Conditional UI rendering
- Feature complexity control

---

### Angular Configuration

**Angular Version**: 21.x (Latest)  
**Features**:
- Standalone components (no module declarations)
- SSR support (Server-Side Rendering)
- Lazy-loaded routing
- Reactive forms (RxJS)
- Material Design components
- Tailwind CSS styling
- Environment-based configuration

---

## Database Schema

### Entity Relationship Overview

```
organizations (tenant root)
├── users
├── applications
│   ├── application_versions (immutable snapshots)
│   ├── workflows
│   │   ├── workflow_nodes
│   │   └── workflow_transitions
│   ├── rules
│   ├── forms
│   │   └── components
│   └── screens
│       └── components
└── submissions (user input)

Execution Runtime:
workflow_instances (from published app_versions)
├── workflow_execution_logs (audit trail)
└── submissions (input data)

Observability:
telemetry_events (analytics)
```

### 15 Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `organizations` | Tenant root | id, slug, name, settings_json |
| `users` | Platform users | id, org_id, email, role, is_active |
| `applications` | Low-code apps | id, app_key, name, current_published_version_id |
| `application_versions` | Immutable snapshots | id, application_id, version_number, status, definition_json |
| `workflows` | Workflow definitions | id, application_id, name, is_active |
| `workflow_nodes` | Steps in workflow | id, workflow_id, node_type, config_json, position_x, position_y |
| `workflow_transitions` | Edges between nodes | id, source_node_id, target_node_id, condition_json, priority |
| `rules` | Business rules | id, application_id, condition_json, action_json, is_active |
| `forms` | Form schemas | id, application_id, schema_json |
| `screens` | UI screens | id, application_id, layout_json |
| `components` | UI components | id, (screen_id OR form_id), config_json |
| `workflow_instances` | Running executions | id, workflow_id, app_version_id, status, context_json |
| `workflow_execution_logs` | Audit trail | id, instance_id, event_type, payload_json |
| `submissions` | Form input | id, instance_id, form_id, data_json, status |
| `telemetry_events` | Analytics | id, event_name, entity_type, entity_id, metadata_json |

### Key Design Patterns

#### **Multi-Tenancy**
- All tables include `organization_id` foreign key
- Queries always filter by org_id (enforce in repository layer)
- Tenant isolation via database constraints

#### **Immutable Versioning**
- `application_versions.definition_json` is the source of truth
- Never UPDATE definition_json after publish
- Used as a read-only snapshot during runtime

#### **Audit & Compliance**
- `workflow_execution_logs` is append-only
- Records every state change in workflow execution
- `created_at` timestamps on all entities
- `updated_at` auto-managed via database trigger

#### **JSONB Configuration**
- `definition_json` - Full app snapshot
- `condition_json` - Rule conditions and transition conditions
- `action_json` - Rule actions
- `context_json` - Runtime execution state
- `data_json` - Form submission data
- `config_json` - Node and component configs
- `metadata_json` - Telemetry metadata

### Indexing Strategy

**B-Tree Indexes** (equality, range queries):
- org_id (most queries filtered by tenant)
- application_id, workflow_id (hierarchical navigation)
- status (filtering by state)
- created_at DESC (recent items first)
- Composite indexes for common filter combinations

**GIN Indexes** (JSONB containment):
- definition_json (search in app definitions)
- context_json (query runtime state)
- data_json (search submission values)

---

## Key Concepts & Terminology

### **Workflow**
A visual diagram representing a business process with steps and decision points. Contains:
- Nodes (steps/states)
- Transitions (connections between nodes)
- Conditions (routing logic)

### **Workflow Instance**
A running execution of a published workflow. Each submission creates or continues an instance.

### **Node**
A single step in a workflow. Types:
- `start` / `end` - Entry/exit points
- `form` - User data input
- `screen` - Display information
- `decision` - Conditional branching
- `action` - Automated operation
- `wait` - Pause execution
- `parallel` - Concurrent paths
- `sub_workflow` - Nested execution

### **Transition**
A directed edge from one node to another, optionally with a condition.

### **Form**
A schema defining fields for user input. Used in form-type nodes.

### **Screen**
A UI layout for displaying information. Used in screen-type nodes.

### **Component**
Reusable UI elements that belong to either a form or screen (XOR constraint).

### **Rule**
Business logic that evaluates conditions and executes actions. Types:
- `condition` - Boolean checks
- `validation` - Input validation
- `calculation` - Computed values
- `routing` - Direct navigation

### **Submission**
User input data submitted through a form during workflow execution.

### **Application Version**
Immutable snapshot of an entire application (workflows, forms, rules, screens) at publish time. Once published, never modified. Used as the runtime blueprint.

### **Status vs State**
- **Status**: Discrete value (enum) - `draft`, `published`, `pending`, `running`, `completed`
- **State**: Context-specific condition tracked during execution

### **Tenant (Organization)**
A single isolated customer boundary. All entities scoped to organization_id.

### **Role**
User permission level within an organization:
- `owner` - Full control
- `admin` - Manage all apps and users
- `editor` - Create and modify apps
- `viewer` - Read-only access

---

## Development Setup

### Prerequisites

- **Node.js**: >= 20.x
- **npm**: >= 10.x
- **PostgreSQL**: 14 or later
- **Git**: Latest version
- **Visual Studio Code**: Recommended IDE

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with database credentials and other config

# Run database migrations
npm run migrate

# Run mock data seeder (optional, for development)
npm run seed

# Start development server with watch mode
npm run start:dev

# Or start production build
npm run build
npm run start
```

**Available Scripts**:
```json
{
  "start": "nest start",
  "start:dev": "nest start --watch",
  "build": "nest build",
  "lint": "eslint \"src/**/*.ts\"",
  "test": "jest"
}
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
npm run build                    # Production build
npm run build:vercel            # Vercel deployment build

# Start development server
npm run start                    # Default port 4200
npm run dev                      # Port 3000 with additional flags

# Watch mode
npm run watch

# Testing
npm run test
npm run lint
```

**Available Scripts**:
```json
{
  "start": "ng serve",
  "dev": "cross-env ng serve --port=3000...",
  "build": "ng build --configuration production",
  "build:vercel": "ng build --configuration production",
  "test": "ng test",
  "lint": "ng lint",
  "serve:ssr:app": "node dist/app/server/server.mjs"
}
```

### Database Configuration

**Connection Details** (.env):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_builder_db
DB_USERNAME=postgres
DB_PASSWORD=password

# Or connection string
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_builder
```

**Migrations**:
```bash
# Run pending migrations
npm run migration:run

# Create new migration
npm run migration:generate --name=migration_name

# Revert last migration
npm run migration:revert
```

### Environment Configuration

**Backend** (.env):
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_builder
DB_USERNAME=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=24h

# CORS
CORS_ORIGIN=http://localhost:3000

# Features
ENABLE_MOCK_DATA=true
```

**Frontend** (environment.ts):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/v1',
  apiTimeout: 30000,
  // Feature flags
  features: {
    nlWorkflowBuilder: true,
    aiRuleBuilder: true,
    analytics: true
  }
};
```

### IDE Setup

**VS Code Extensions** (Recommended):
- ESLint
- Prettier - Code formatter
- NestJS API Documentation
- Angular Language Service
- Thunder Client or REST Client (API testing)

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": ["typescript", "javascript"]
}
```

---

## API Routes & Endpoints

### API Base URL
```
http://localhost:3001/v1
```

### Authentication Endpoints

```
POST    /auth/login                  Create JWT token
        Payload: { email, password }
        Response: { access_token, expires_in }
```

### Applications Endpoints

```
GET     /applications                List all applications in organization
POST    /applications                Create new application
        Payload: { name, description? }

GET     /applications/:id            Get application details
PUT     /applications/:id            Update application
        Payload: { name, description? }

DELETE  /applications/:id            Archive application (soft delete)

POST    /applications/:id/publish    Publish new version
        Payload: { changelog? }
        Response: { version_id, version_number }

GET     /applications/:id/versions   List all versions
GET     /applications/:id/versions/:versionId  Get specific version
```

### Workflows Endpoints

```
GET     /workflows                   List workflows in application
POST    /workflows                   Create workflow
        Payload: { applicationId, name, description? }

GET     /workflows/:id               Get workflow details
PUT     /workflows/:id               Update workflow
DELETE  /workflows/:id               Delete workflow

GET     /workflows/:id/nodes         List nodes
POST    /workflows/:id/nodes         Create node
        Payload: { nodeType, label, config_json? }

GET     /workflows/:id/nodes/:nodeId Update node
PUT     /workflows/:id/nodes/:nodeId Update node
DELETE  /workflows/:id/nodes/:nodeId Delete node

POST    /workflows/:id/transitions   Create transition
        Payload: { sourceNodeId, targetNodeId, condition_json?, label? }

PUT     /workflows/:id/transitions/:transitionId  Update transition
DELETE  /workflows/:id/transitions/:transitionId  Delete transition
```

### Rules Endpoints

```
GET     /rules                       List rules in application
POST    /rules                       Create rule
        Payload: { applicationId, name, ruleType, condition_json, action_json? }

GET     /rules/:id                   Get rule details
PUT     /rules/:id                   Update rule
DELETE  /rules/:id                   Delete rule

PUT     /rules/:id/toggle            Enable/disable rule
```

### Runtime Endpoints

```
POST    /runtime/instances           Create workflow instance
        Payload: { workflowId, versionId }
        Response: { instanceId, status, context_json }

GET     /runtime/instances           List instances with filtering
GET     /runtime/instances/:id       Get instance details

POST    /runtime/instances/:id/execute   Execute next step
        Response: { nextNodeId, status, context_json }

PUT     /runtime/instances/:id/pause  Pause execution
PUT     /runtime/instances/:id/resume Resume execution
PUT     /runtime/instances/:id/cancel Cancel execution
```

### Submissions Endpoints

```
POST    /submissions                 Submit form data
        Payload: { instanceId, formId, data_json }
        Response: { submissionId, status }

GET     /submissions                 List submissions (org-wide)
GET     /submissions/:id             Get submission details
PUT     /submissions/:id             Update submission status
```

### Telemetry Endpoints

```
GET     /telemetry/events            List telemetry events
        Query: ?startDate=...&endDate=...&eventName=...

GET     /telemetry/analytics         Get analytics dashboard data
GET     /telemetry/instances/:id/logs  Get execution logs for instance
```

### Guard & Middleware

All endpoints (except `/auth/login`) require:
1. **JWT Bearer Token** in Authorization header
   ```
   Authorization: Bearer <token>
   ```
2. **Tenant ID** (organization_id) automatically extracted from token
3. **Role-based access control** enforced via `@Roles()` decorator

---

## Authentication & Authorization

### JWT-Based Authentication

```typescript
// Login
POST /v1/auth/login
{
  "email": "user@org.com",
  "password": "password"
}

Response:
{
  "access_token": "eyJhbGc...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

### Token Structure (JWT Payload)

```typescript
{
  "sub": "user-id-uuid",           // User ID
  "email": "user@org.com",
  "organizationId": "org-id-uuid", // Tenant ID
  "role": "editor",                 // User role
  "iat": 1234567890,
  "exp": 1234567890 + 86400
}
```

### Authorization Guards

```typescript
// In controller methods
@UseGuards(JwtAuthGuard)           // Requires valid JWT
@Roles('admin', 'editor')          // Requires specific roles
async updateWorkflow(
  @Param('id') workflowId: string,
  @CurrentUser() user: UserPayload,
  @TenantId() organizationId: string
) {
  // user and organizationId available
}
```

### RBAC Roles

| Role | Permissions |
|------|------------|
| `owner` | Full access, manage users, billing, settings |
| `admin` | Manage apps, users, organization settings |
| `editor` | Create/edit apps, publish, manage submissions |
| `viewer` | Read-only access to apps and submissions |

### Custom Decorators

```typescript
// Decorators available in common/decorators/

@CurrentUser()       // Injects JWT payload
@Roles(...roles)     // Check required roles
@TenantId()         // Inject organization_id from token
```

---

## Multi-Tenancy Architecture

### Tenant Isolation

1. **Database Level**:
   - Every table includes `organization_id` column
   - Foreign key to `organizations` table
   - Unique constraints include org_id

2. **Application Level**:
   - JWT payload includes `organizationId`
   - `TenantInterceptor` injects org_id into all requests
   - Repository queries always filter by org_id

3. **Query Pattern**:
   ```typescript
   // Always include organization filter
   async findById(id: string, organizationId: string) {
     return this.repo.findOne({ 
       where: { id, organizationId }  // Check both ID and org
     });
   }
   ```

4. **HTTP Interceptor** (Frontend):
   - Automatically adds auth token to all requests
   - Routes configured to require authentication

### Tenant-Aware Queries

```sql
-- Bad: Missing org_id check
SELECT * FROM workflows WHERE id = 'uuid';

-- Good: Always include org_id
SELECT * FROM workflows 
WHERE id = 'uuid' 
  AND organization_id = 'org-uuid';
```

---

## Workflow Execution Model

### Execution Flow

```
1. CREATE INSTANCE
   ↓
2. SELECT START NODE
   ↓
3. ENTER NODE (execute node logic)
   ↓
4. EVALUATE TRANSITIONS
   ↓
5. SELECT NEXT NODE (based on condition)
   ↓
6. IF NEXT IS END NODE
   → Mark instance as COMPLETED
   ELSE
   → Go to step 3
   ↓
7. LOG EXECUTION
   ↓
8. RETURN CONTEXT
```

### Execution Context

The `context_json` field in `workflow_instances` stores accumulated state:

```json
{
  "variables": {
    "firstName": "John",
    "submitted_data": { /* form data */ },
    "rule_results": { /* rule evaluation results */ }
  },
  "history": [
    "node-uuid-start",
    "node-uuid-form",
    "node-uuid-decision"
  ],
  "ruleEvaluations": {
    "rule-uuid-1": {
      "matched": true,
      "timestamp": "2026-03-18T10:00:00Z",
      "action": { /* executed action */ }
    }
  }
}
```

### Node Execution

**Form Node**:
1. Wait for user submission
2. Validate submission against form schema
3. Store submission in database
4. Add data to context
5. Proceed to next node

**Decision Node**:
1. Evaluate condition logic
2. Select transition based on conditions
3. Proceed to target node

**Action Node**:
1. Execute integration (API call, email, etc)
2. Store result in context
3. Proceed to next node

**Screen Node**:
1. Display screen to user
2. Wait for user acknowledgement
3. Proceed to next node

### State Machine Transitions

```
Start
  ↓
Node A (form) ← Submit data
  ↓
Node B (decision) ← Check condition
  ├→ YES: Node C (action)
  └→ NO: Node D (screen)
  ↓
End
```

---

## Rule Engine

### Rule Evaluation

Rule engine evaluates conditions at:
1. **Transition time**: Determine which path to take
2. **Submission time**: Validate and process input
3. **Scheduled time**: Batch evaluation (future feature)

### Condition Syntax

Conditions are trees of boolean logic:

```json
{
  "type": "and",
  "conditions": [
    {
      "field": "age",
      "operator": ">=",
      "value": 18
    },
    {
      "type": "or",
      "conditions": [
        { "field": "country", "operator": "=", "value": "US" },
        { "field": "country", "operator": "=", "value": "CA" }
      ]
    }
  ]
}
```

### Action Types

**Route Action**:
```json
{
  "type": "route",
  "targetNodeId": "uuid"
}
```
Direct workflow to specific node.

**Calculate Action**:
```json
{
  "type": "calculate",
  "variable": "discount",
  "expression": "subtotal * 0.1"
}
```
Compute values and store in context.

**Notify Action**:
```json
{
  "type": "notify",
  "channel": "email|sms|webhook",
  "recipient": "user@example.com",
  "template": "template_id"
}
```
Send notifications.

**Validate Action**:
```json
{
  "type": "validate",
  "message": "Age must be 18 or older"
}
```
Custom validation with error message.

---

## Data Flow Diagrams

### Application Design Flow

```
User → Builder UI (Angular)
       ↓
       Create Workflow (nodes + transitions)
       Create Forms (schemas)
       Create Rules (conditions + actions)
       ↓
       Save (stored as drafts in DB)
       ↓
       Validate (schema validation)
       ↓
       Publish (create ApplicationVersion snapshot)
       ↓
Backend: Capture full definition → SHA-256 hash → Immutable snapshot
```

### Workflow Execution Flow

```
User → Start Instance (POST /runtime/instances)
       ↓
       Backend: Create WorkflowInstance record
       ↓
       Enter Start Node
       ↓
       Load Published ApplicationVersion.definition_json
       ↓
       LOOP:
       - Execute current node
       - Evaluate transitions
       - Evaluate rule conditions
       - Select next node
       - Log execution (WorkflowExecutionLog)
       - Update instance context
       - Check if end node reached
       ↓
       Complete/Fail/Cancel
       ↓
       Return instance with context
       ↓
User → View Results → Download/Export submission data
```

### Submission Processing Flow

```
User → Submit Form
       ↓
       Frontend: POST /submissions with form data
       ↓
       Backend: SubmissionsService.create()
       ↓
       Validate against form schema
       ↓
       Store submission in DB
       ↓
       Trigger workflow progression
       ↓
       RulesService.evaluate()
       ↓
       Apply rule actions
       ↓
       Update workflow instance context
       ↓
       Log telemetry event
       ↓
Response: { submissionId, status }
```

### Telemetry Event Flow

```
Any Action → Event occurs (workflow started, rule evaluated, etc)
             ↓
             EventsService.emit(domainEvent)
             ↓
             TelemetryService.track()
             ↓
             Insert TelemetryEvent record
             ↓
             (Optional) Forward to external analytics
```

---

## Common Patterns

### Service Pattern

```typescript
// Every module has a service with CRUD operations

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private repo: Repository<Workflow>
  ) {}

  // Always include organizationId for tenant safety
  async findByIdOrFail(
    id: string, 
    organizationId: string
  ): Promise<Workflow> {
    return this.repo.findOneByOrFail({ id, organizationId });
  }

  async create(
    dto: CreateWorkflowDto,
    organizationId: string
  ): Promise<Workflow> {
    const entity = this.repo.create({
      ...dto,
      organizationId // Always set org_id
    });
    return this.repo.save(entity);
  }
}
```

### DTO Pattern

```typescript
// Use class-validator decorators for input validation

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  applicationId: string;
}
```

### Guard Pattern

```typescript
// Role-based access control

@Controller('/workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  @Post()
  @Roles('editor', 'admin')
  async create(
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: UserPayload,
    @TenantId() orgId: string
  ) {
    return this.service.create(dto, orgId);
  }
}
```

### Component Pattern (Angular)

```typescript
// Use OnPush change detection for performance

@Component({
  selector: 'app-workflow-builder',
  templateUrl: './workflow-builder.component.html',
  styleUrl: './workflow-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkflowBuilderComponent {
  // Use private property with getter for encapsulation
  private workflow$ = new BehaviorSubject<Workflow | null>(null);
  workflow = this.workflow$.asObservable();

  constructor(private svc: WorkflowService) {}

  ngOnInit() {
    // Use async pipe in template to avoid manual subscriptions
    this.svc.loadWorkflow(this.workflowId).subscribe(workflow =>
      this.workflow$.next(workflow)
    );
  }
}
```

### Repository Pattern

```typescript
// Service delegates to repository
// Repository handles database queries

@Repository()
export class WorkflowRepository {
  async findByApplicationAndOrg(
    applicationId: string,
    organizationId: string
  ) {
    return this.find({
      where: { applicationId, organizationId }
    });
  }
}

@Injectable()
export class WorkflowsService {
  constructor(private repo: WorkflowRepository) {}

  findByApplication(appId: string, orgId: string) {
    return this.repo.findByApplicationAndOrg(appId, orgId);
  }
}
```

---

## Contributing Guidelines

### Code Style

#### TypeScript
- Strict mode enabled (`strict: true` in tsconfig.json)
- PascalCase for classes and types
- camelCase for functions and variables
- UPPER_SNAKE_CASE for constants
- Use explicit types (avoid `any`)

#### NestJS
- One service per module
- Controllers delegate to services
- Services contain business logic
- Guards and interceptors for cross-cutting concerns

#### Angular
- Standalone components (Angular 14+)
- Reactive forms (RxJS observables)
- OnPush change detection by default
- Use async pipe in templates
- Inject services via constructor

### Branch Strategy

```
main                 (production)
 └── develop        (integration)
      └── feature/* (feature branches)
          - feature/add-rule-engine
          - feature/improve-workflow-builder
      └── bugfix/*  (bugfix branches)
          - bugfix/fix-submission-hang
      └── refactor/* (refactoring branches)
          - refactor/extract-rule-service
```

### Commit Convention

Use Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Add/update tests
- `docs`: Documentation
- `perf`: Performance improvement
- `style`: Code formatting
- `ci`: CI/CD configuration
- `chore`: Dependencies, tooling

**Example**:
```
feat(workflows): add parallel node type support

- Implement ParallelNode entity
- Update workflow validator to support parallel
- Add parallel execution in runtime service

Closes #123
```

### Testing

**Backend**:
```bash
# Run all tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

**Frontend**:
```bash
# Run tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

**Test Structure**:
```typescript
describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockRepository: Partial<Repository<Workflow>>;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn()
    };
    service = new WorkflowsService(mockRepository as any);
  });

  describe('findById', () => {
    it('should return workflow when found', async () => {
      const workflow = { id: '123', name: 'Test' };
      (mockRepository.findOne as jest.Mock).mockResolvedValue(workflow);

      const result = await service.findById('123', 'org-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123', organizationId: 'org-123' }
      });
      expect(result).toEqual(workflow);
    });
  });
});
```

### PR Checklist

- [ ] Branch created from `develop`
- [ ] Tests written for new features
- [ ] Existing tests still pass
- [ ] Code follows style guide
- [ ] No console.log or debug statements
- [ ] Comments explain "why", not "what"
- [ ] Database migrations created (if needed)
- [ ] Environment variables documented
- [ ] PR description explains changes and motivation

### Code Review Focus Areas

1. **Security**: No SQL injection, XSS, CSRF vulnerabilities
2. **Performance**: No N+1 queries, proper indexing used
3. **Testability**: Code is testable, mocks are used
4. **Maintainability**: Clear naming, single responsibility
5. **Consistency**: Follows project patterns and conventions
6. **Documentation**: Code and usage is documented

---

## Deployment Notes

### Backend Deployment

**Production Build**:
```bash
cd backend
npm install
npm run build
npm run start
```

**Environment Variables**:
```
NODE_ENV=production
PORT=3001
DB_HOST=prod-db-host
DB_PORT=5432
DB_NAME=workflow_builder
DB_USERNAME=prod_user
DB_PASSWORD=*** (from secrets manager)
JWT_SECRET=*** (from secrets manager)
CORS_ORIGIN=https://yourdomain.com
```

**Health Check Endpoint**:
```
GET /health
Response: { status: 'ok' }
```

### Frontend Deployment

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/app/browser"
}
```

**Environment Variables** (Vercel):
```
ANGULAR_API_URL=https://api.yourdomain.com/v1
```

**Build Output**:
- Browser app: `dist/app/browser`
- Server app: `dist/app/server`
- Can be deployed to Vercel, Netlify, or any static host with SSR support

### Database Migrations

**Before Deployment**:
```bash
# Run pending migrations
npm run migration:run

# Or if using Flyway/Liquibase
# Ensure migrations in db/migrations/ are applied
```

### Monitoring & Observability

**Backend Metrics**:
- Request count
- Error rate
- Database connection pool
- JWT token generation rate
- HTTP status codes

**Frontend Metrics**:
- Page load time
- Core Web Vitals
- JavaScript errors
- Component rendering performance

**Logging**:
- Structured logging (JSON)
- Different log levels (debug, info, warn, error)
- Request IDs for correlation

### Scaling Considerations

- **Horizontal Scaling**: Stateless backend services can scale independently
- **Database**: Consider read replicas for analytics queries
- **Cache**: Redis for session storage and frequent queries
- **Workers**: Background job queue for long-running operations
- **CDN**: Static assets and API responses caching

---

## Quick Reference

### Install & Run Locally

```bash
# Backend
cd backend
npm install
# Configure .env
npm run start:dev   # dev with watch
npm run test        # run tests

# Frontend (separate terminal)
cd frontend
npm install
npm start           # serves at http://localhost:4200
```

### Key Files

| File | Purpose |
|------|---------|
| [backend/src/app.module.ts](backend/src/app.module.ts) | Backend root module |
| [backend/src/infrastructure/database/DATABASE_SCHEMA_GUIDE.md](backend/src/infrastructure/database/DATABASE_SCHEMA_GUIDE.md) | Database schema documentation |
| [frontend/src/app/app.ts](frontend/src/app/app.ts) | Frontend root component |
| [.github/agents/lowcodeAgent.agent.md](.github/agents/lowcodeAgent.agent.md) | Agent persona documentation |

### Common Tasks

```bash
# Creating a new workflow
POST /v1/workflows
{
  "applicationId": "app-uuid",
  "name": "Onboarding Process"
}

# Publishing an application
POST /v1/applications/:appId/publish
{}

# Starting a workflow instance
POST /v1/runtime/instances
{
  "workflowId": "workflow-uuid",
  "versionId": "version-uuid"
}

# Submitting form data
POST /v1/submissions
{
  "instanceId": "instance-uuid",
  "formId": "form-uuid",
  "data_json": { "field1": "value1" }
}
```

---

## Additional Resources

- **Database Schema**: [backend/src/infrastructure/database/DATABASE_SCHEMA_GUIDE.md](backend/src/infrastructure/database/DATABASE_SCHEMA_GUIDE.md)
- **Agent Documentation**: [.github/agents/lowcodeAgent.agent.md](.github/agents/lowcodeAgent.agent.md)
- **NestJS Docs**: https://docs.nestjs.com
- **Angular Docs**: https://angular.io/docs
- **TypeORM Docs**: https://typeorm.io
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

**Last Updated**: March 18, 2026

For questions or contributions, please follow the [Contributing Guidelines](#contributing-guidelines) section above.
