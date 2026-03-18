# Database Schema Documentation & Migration Guide

> **Platform**: Low-Code Workflow Automation  
> **Database**: PostgreSQL 14+  
> **Migration File**: `0001_initial_schema.sql`  
> **Last Updated**: March 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Reference](#3-table-reference)
4. [Relationships & Foreign Keys](#4-relationships--foreign-keys)
5. [Status Enums & CHECK Constraints](#5-status-enums--check-constraints)
6. [Indexing Strategy](#6-indexing-strategy)
7. [JSONB Column Contracts](#7-jsonb-column-contracts)
8. [Migration Execution Guide](#8-migration-execution-guide)
9. [TypeORM Entity Alignment](#9-typeorm-entity-alignment)
10. [Multi-Tenancy Pattern](#10-multi-tenancy-pattern)
11. [Common Queries](#11-common-queries)
12. [Future Migrations Roadmap](#12-future-migrations-roadmap)

---

## 1. Architecture Overview

The schema supports a multi-tenant low-code platform with two operational modes:

### Authoring (Design-Time)
Users define applications containing workflows, forms, screens, rules, and components. Each save creates an immutable **application version** snapshot.

### Runtime (Execution-Time)
Published application versions spawn **workflow instances**. User input arrives as **submissions**, which are processed through the rule engine. Every state change is logged in **execution logs** and **telemetry events**.

### Data Flow

```
Organization
 └── Application
      ├── Workflows → Nodes → Transitions
      ├── Forms → Components
      ├── Screens → Components
      ├── Rules
      └── Application Versions (immutable snapshots)
           └── Workflow Instances (runtime)
                ├── Submissions
                ├── Execution Logs
                └── Telemetry Events
```

---

## 2. Entity Relationship Diagram

```
┌──────────────────┐
│  organizations   │
│  (tenant root)   │
└────────┬─────────┘
         │ 1:N
    ┌────┴──────────────────────────────────────────────────┐
    │                    │              │                    │
    ▼                    ▼              ▼                    ▼
┌────────┐     ┌──────────────┐  ┌──────────┐    ┌──────────────────┐
│ users  │     │ applications │  │  rules   │    │ telemetry_events │
└────────┘     └──────┬───────┘  └──────────┘    └──────────────────┘
                      │ 1:N
         ┌────────────┼──────────────┬───────────────┐
         │            │              │               │
         ▼            ▼              ▼               ▼
  ┌────────────┐ ┌─────────┐  ┌──────────┐  ┌───────────────────┐
  │ app_versions│ │workflows│  │  forms   │  │     screens       │
  └────────────┘ └────┬────┘  └────┬─────┘  └────────┬──────────┘
                      │ 1:N       │ 1:N              │ 1:N
                ┌─────┴────┐      │                  │
                │          │      └───────┬──────────┘
                ▼          ▼              ▼
        ┌────────────┐ ┌──────────────┐ ┌────────────┐
        │workflow_   │ │workflow_     │ │ components │
        │nodes       │ │transitions  │ └────────────┘
        └─────┬──────┘ └─────────────┘
              │
              │ (runtime references)
              ▼
  ┌───────────────────────┐
  │  workflow_instances   │
  └───────────┬───────────┘
              │ 1:N
         ┌────┴────────┐
         ▼             ▼
  ┌─────────────┐ ┌──────────────────────┐
  │ submissions │ │workflow_execution_logs│
  └─────────────┘ └──────────────────────┘
```

---

## 3. Table Reference

### 3.1 `organizations`
**Purpose**: Tenant root. Every entity traces back here.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `slug` | `varchar(120)` | NO | — | URL-friendly unique identifier |
| `name` | `varchar(200)` | NO | — | Display name |
| `settings_json` | `jsonb` | NO | `'{}'` | Org-level config (locale, timezone, feature flags) |
| `created_at` | `timestamptz` | NO | `NOW()` | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `NOW()` | Last modification (auto-updated via trigger) |

---

### 3.2 `users`
**Purpose**: Platform users scoped to an organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `email` | `varchar(255)` | NO | — | Unique within org |
| `display_name` | `varchar(200)` | NO | — | Full name |
| `role` | `varchar(50)` | NO | `'viewer'` | One of: `owner`, `admin`, `editor`, `viewer` |
| `is_active` | `boolean` | NO | `true` | Soft disable without delete |
| `last_login_at` | `timestamptz` | YES | — | Last authentication |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

**Constraints**: `UNIQUE(organization_id, email)`, `CHECK role IN (owner, admin, editor, viewer)`

---

### 3.3 `applications`
**Purpose**: A low-code application owned by an organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `app_key` | `varchar(120)` | NO | — | Machine-friendly key, unique per org |
| `name` | `varchar(200)` | NO | — | Display name |
| `description` | `text` | YES | — | Optional description |
| `current_published_version_id` | `uuid` | YES | — | FK → `application_versions.id` (deferred) |
| `is_archived` | `boolean` | NO | `false` | Soft archive |
| `created_by` | `uuid` | YES | — | FK → `users.id` |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

**Constraints**: `UNIQUE(organization_id, app_key)`

---

### 3.4 `application_versions`
**Purpose**: Immutable snapshot of an application's full definition at publish time.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `version_number` | `int` | NO | — | Monotonically increasing per app |
| `status` | `varchar(20)` | NO | `'draft'` | `draft`, `published`, `archived`, `rollback` |
| `definition_json` | `jsonb` | NO | — | Full app snapshot (workflows, forms, rules, screens) |
| `definition_hash` | `char(64)` | NO | — | SHA-256 hex digest for deduplication |
| `created_by` | `uuid` | NO | — | FK → `users.id` |
| `published_at` | `timestamptz` | YES | — | When status changed to `published` |
| `created_at` | `timestamptz` | NO | `NOW()` | — |

**Constraints**: `UNIQUE(application_id, version_number)`, `CHECK version_number > 0`, `CHECK status IN (...)`

**Important**: `definition_json` is the **source of truth** for runtime. Once published, it must NEVER be mutated.

---

### 3.5 `workflows`
**Purpose**: A workflow definition within an application (design-time).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `name` | `varchar(200)` | NO | — | Workflow name |
| `description` | `text` | YES | — | Optional |
| `is_active` | `boolean` | NO | `true` | Soft disable |
| `created_by` | `uuid` | YES | — | FK → `users.id` |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

---

### 3.6 `workflow_nodes`
**Purpose**: Individual steps/states within a workflow graph.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `workflow_id` | `uuid` | NO | — | FK → `workflows.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `node_type` | `varchar(50)` | NO | — | Node kind (see CHECK constraint) |
| `label` | `varchar(200)` | NO | — | Display label |
| `config_json` | `jsonb` | NO | `'{}'` | Node-specific configuration |
| `position_x` | `int` | NO | `0` | Canvas X position (builder UI) |
| `position_y` | `int` | NO | `0` | Canvas Y position (builder UI) |
| `is_start_node` | `boolean` | NO | `false` | Entry point marker |
| `is_end_node` | `boolean` | NO | `false` | Terminal node marker |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

**Valid `node_type` values**: `start`, `end`, `form`, `screen`, `decision`, `action`, `wait`, `parallel`, `sub_workflow`

---

### 3.7 `workflow_transitions`
**Purpose**: Directed edges between workflow nodes (graph edges).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `workflow_id` | `uuid` | NO | — | FK → `workflows.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `source_node_id` | `uuid` | NO | — | FK → `workflow_nodes.id` |
| `target_node_id` | `uuid` | NO | — | FK → `workflow_nodes.id` |
| `condition_json` | `jsonb` | YES | — | Optional routing condition |
| `priority` | `int` | NO | `0` | Evaluation order (lower = first) |
| `label` | `varchar(200)` | YES | — | Edge label for builder UI |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

**Constraints**: `CHECK(source_node_id <> target_node_id)` — prevents self-loops

---

### 3.8 `rules`
**Purpose**: Business rules evaluated at runtime against submissions and workflow context.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `name` | `varchar(200)` | NO | — | Rule name |
| `description` | `text` | YES | — | Human-readable explanation |
| `rule_type` | `varchar(50)` | NO | `'condition'` | `condition`, `validation`, `calculation`, `routing` |
| `condition_json` | `jsonb` | NO | — | Rule condition tree |
| `action_json` | `jsonb` | NO | `'{}'` | Action to execute when condition is met |
| `priority` | `int` | NO | `0` | Evaluation order |
| `is_active` | `boolean` | NO | `true` | Enable/disable toggle |
| `created_by` | `uuid` | YES | — | FK → `users.id` |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

---

### 3.9 `forms`
**Purpose**: Form schema definitions used in form-type workflow nodes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `name` | `varchar(200)` | NO | — | Form name |
| `description` | `text` | YES | — | Optional |
| `schema_json` | `jsonb` | NO | `'[]'` | Array of field definitions |
| `created_by` | `uuid` | YES | — | FK → `users.id` |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

---

### 3.10 `screens`
**Purpose**: UI screen layouts used in screen-type workflow nodes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `name` | `varchar(200)` | NO | — | Screen name |
| `layout_json` | `jsonb` | NO | `'{}'` | Layout structure |
| `created_by` | `uuid` | YES | — | FK → `users.id` |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

---

### 3.11 `components`
**Purpose**: Reusable UI components belonging to either a screen OR a form (never both).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `screen_id` | `uuid` | YES | — | FK → `screens.id` (mutually exclusive with form_id) |
| `form_id` | `uuid` | YES | — | FK → `forms.id` (mutually exclusive with screen_id) |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `component_type` | `varchar(80)` | NO | — | Component kind (e.g., `short-text`, `dropdown`, `button`) |
| `config_json` | `jsonb` | NO | `'{}'` | Component-specific configuration |
| `sort_order` | `int` | NO | `0` | Rendering order within parent |
| `created_at` | `timestamptz` | NO | `NOW()` | — |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

**Constraint**: `CHECK((screen_id IS NOT NULL AND form_id IS NULL) OR (screen_id IS NULL AND form_id IS NOT NULL))` — XOR parent ownership

---

### 3.12 `workflow_instances`
**Purpose**: A running execution of a workflow (runtime).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `application_version_id` | `uuid` | NO | — | FK → `application_versions.id` (RESTRICT delete) |
| `workflow_id` | `uuid` | NO | — | FK → `workflows.id` (RESTRICT delete) |
| `current_node_id` | `uuid` | YES | — | FK → `workflow_nodes.id` |
| `status` | `varchar(20)` | NO | `'pending'` | Lifecycle state |
| `context_json` | `jsonb` | NO | `'{}'` | Runtime execution context (accumulated data) |
| `started_by` | `uuid` | YES | — | FK → `users.id` |
| `started_at` | `timestamptz` | NO | `NOW()` | — |
| `ended_at` | `timestamptz` | YES | — | Completion timestamp |
| `updated_at` | `timestamptz` | NO | `NOW()` | Auto-updated |

**Valid statuses**: `pending`, `running`, `paused`, `completed`, `failed`, `cancelled`

---

### 3.13 `workflow_execution_logs`
**Purpose**: Immutable audit trail of every state change in a workflow instance.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `workflow_instance_id` | `uuid` | NO | — | FK → `workflow_instances.id` |
| `event_type` | `varchar(100)` | NO | — | Event name (e.g., `node_entered`, `rule_evaluated`, `transition_taken`) |
| `node_id` | `uuid` | YES | — | FK → `workflow_nodes.id` |
| `actor_id` | `uuid` | YES | — | FK → `users.id` |
| `payload_json` | `jsonb` | NO | `'{}'` | Event-specific data |
| `created_at` | `timestamptz` | NO | `NOW()` | Immutable timestamp |

**Note**: This table is append-only. Never UPDATE or DELETE rows.

---

### 3.14 `submissions`
**Purpose**: User input data submitted through forms during workflow execution.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `application_id` | `uuid` | NO | — | FK → `applications.id` |
| `workflow_instance_id` | `uuid` | YES | — | FK → `workflow_instances.id` |
| `form_id` | `uuid` | YES | — | FK → `forms.id` |
| `node_id` | `uuid` | YES | — | FK → `workflow_nodes.id` |
| `submitted_by` | `uuid` | YES | — | FK → `users.id` |
| `data_json` | `jsonb` | NO | `'{}'` | Form field values |
| `status` | `varchar(20)` | NO | `'pending'` | Processing state |
| `created_at` | `timestamptz` | NO | `NOW()` | Submission time |
| `processed_at` | `timestamptz` | YES | — | When processing completed |

**Valid statuses**: `pending`, `processing`, `completed`, `failed`, `rejected`

---

### 3.15 `telemetry_events`
**Purpose**: Platform-wide observability events for analytics and monitoring.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | Primary key |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` |
| `event_name` | `varchar(150)` | NO | — | Event identifier (e.g., `workflow.started`, `submission.created`) |
| `event_category` | `varchar(50)` | NO | — | Category grouping |
| `actor_id` | `uuid` | YES | — | FK → `users.id` |
| `entity_type` | `varchar(80)` | YES | — | Polymorphic type (e.g., `workflow_instance`, `submission`) |
| `entity_id` | `uuid` | YES | — | Polymorphic reference |
| `metadata_json` | `jsonb` | NO | `'{}'` | Additional structured data |
| `created_at` | `timestamptz` | NO | `NOW()` | Event timestamp |

**Valid categories**: `workflow`, `submission`, `rule`, `user_action`, `system`, `error`

---

## 4. Relationships & Foreign Keys

### Cascade Strategy

| FK Relationship | ON DELETE | Rationale |
|----------------|-----------|-----------|
| `users.organization_id` → `organizations` | `CASCADE` | Deleting org removes all its users |
| `applications.organization_id` → `organizations` | `CASCADE` | Deleting org removes all its apps |
| `application_versions.application_id` → `applications` | `CASCADE` | Deleting app removes all versions |
| `workflows.application_id` → `applications` | `CASCADE` | Deleting app removes workflows |
| `workflow_instances.application_version_id` → `application_versions` | `RESTRICT` | Cannot delete a version with running instances |
| `workflow_instances.workflow_id` → `workflows` | `RESTRICT` | Cannot delete workflow with running instances |
| `workflow_instances.current_node_id` → `workflow_nodes` | `SET NULL` | Node deletion doesn't crash instances |
| `applications.current_published_version_id` → `application_versions` | `SET NULL` | Version removal clears the pointer |
| `*.created_by` / `*.submitted_by` / `*.actor_id` → `users` | `SET NULL` | User deletion preserves historical records |

### Key Principle
- **Design-time entities**: `CASCADE` — delete the parent, delete the children
- **Runtime entities**: `RESTRICT` — cannot delete design-time data while runtime data depends on it
- **Actor references**: `SET NULL` — preserve records even if the user is removed

---

## 5. Status Enums & CHECK Constraints

### Application Version Status Lifecycle

```
draft → published → archived
                  → rollback
```

| Status | Meaning |
|--------|---------|
| `draft` | Being edited, not yet available for execution |
| `published` | Active and available for new workflow instances |
| `archived` | Retired; existing instances continue, no new ones |
| `rollback` | Replaced by a newer version but kept for audit |

### Workflow Instance Status Lifecycle

```
pending → running → completed
                  → failed
                  → cancelled
         running → paused → running
```

| Status | Meaning |
|--------|---------|
| `pending` | Created but execution hasn't started |
| `running` | Actively executing; sits at a node waiting or processing |
| `paused` | Temporarily suspended (manual or system) |
| `completed` | Reached an end node successfully |
| `failed` | Error during execution |
| `cancelled` | Manually terminated before completion |

### Submission Status Lifecycle

```
pending → processing → completed
                     → failed
                     → rejected
```

### Other CHECK Constraints

| Table | Constraint | Rule |
|-------|-----------|------|
| `users` | `chk_users_role` | `role IN ('owner', 'admin', 'editor', 'viewer')` |
| `application_versions` | `chk_version_number_positive` | `version_number > 0` |
| `workflow_nodes` | `chk_node_type` | `node_type IN ('start', 'end', 'form', 'screen', 'decision', 'action', 'wait', 'parallel', 'sub_workflow')` |
| `workflow_transitions` | `chk_no_self_loop` | `source_node_id <> target_node_id` |
| `components` | `chk_component_parent` | XOR: belongs to exactly one screen or one form |
| `telemetry_events` | `chk_telemetry_category` | `event_category IN ('workflow', 'submission', 'rule', 'user_action', 'system', 'error')` |

---

## 6. Indexing Strategy

### B-Tree Indexes (equality & range queries)

| Index | Table | Columns | Query Pattern |
|-------|-------|---------|---------------|
| `idx_users_org` | `users` | `organization_id` | List users by org |
| `idx_users_email` | `users` | `email` | Login lookup |
| `idx_apps_org` | `applications` | `organization_id` | List apps by org |
| `idx_apps_org_archived` | `applications` | `organization_id, is_archived` | Active apps dashboard |
| `idx_versions_app` | `application_versions` | `application_id` | Version history |
| `idx_versions_org` | `application_versions` | `organization_id` | Org-wide version queries |
| `idx_versions_status` | `application_versions` | `application_id, status` | Find published version |
| `idx_workflows_app` | `workflows` | `application_id` | Workflows per app |
| `idx_workflows_org` | `workflows` | `organization_id` | Org-level workflow queries |
| `idx_nodes_workflow` | `workflow_nodes` | `workflow_id` | Load all nodes for a workflow |
| `idx_transitions_workflow` | `workflow_transitions` | `workflow_id` | Load all edges for a workflow |
| `idx_transitions_source` | `workflow_transitions` | `source_node_id` | Find outgoing edges from a node |
| `idx_transitions_target` | `workflow_transitions` | `target_node_id` | Find incoming edges to a node |
| `idx_rules_app` | `rules` | `application_id` | Rules per app |
| `idx_rules_org_active` | `rules` | `organization_id, is_active` | Active rules engine query |
| `idx_forms_app` | `forms` | `application_id` | Forms per app |
| `idx_screens_app` | `screens` | `application_id` | Screens per app |
| `idx_components_screen` | `components` | `screen_id` | Components per screen |
| `idx_components_form` | `components` | `form_id` | Components per form |
| `idx_instances_org` | `workflow_instances` | `organization_id` | Org-level instance listing |
| `idx_instances_org_app_version` | `workflow_instances` | `organization_id, application_version_id` | Instances per version |
| `idx_instances_status` | `workflow_instances` | `status` | Filter running/pending instances |
| `idx_instances_workflow` | `workflow_instances` | `workflow_id` | Instances per workflow |
| `idx_instances_started` | `workflow_instances` | `started_at DESC` | Recent instances |
| `idx_logs_instance_created` | `workflow_execution_logs` | `workflow_instance_id, created_at` | Instance timeline |
| `idx_logs_event_type` | `workflow_execution_logs` | `event_type` | Filter by event kind |
| `idx_logs_created_at` | `workflow_execution_logs` | `created_at DESC` | Recent logs |
| `idx_submissions_org` | `submissions` | `organization_id` | Org submissions |
| `idx_submissions_instance` | `submissions` | `workflow_instance_id` | Submissions per instance |
| `idx_submissions_status` | `submissions` | `status` | Pending processing queue |
| `idx_submissions_form` | `submissions` | `form_id` | Submissions per form |
| `idx_submissions_created` | `submissions` | `created_at DESC` | Recent submissions |
| `idx_telemetry_org_created` | `telemetry_events` | `organization_id, created_at DESC` | Org analytics |
| `idx_telemetry_event_name` | `telemetry_events` | `event_name` | Filter by event |
| `idx_telemetry_entity` | `telemetry_events` | `entity_type, entity_id` | Entity history |

### GIN Indexes (JSONB containment queries)

| Index | Table | Column | Use Case |
|-------|-------|--------|----------|
| `idx_gin_version_definition` | `application_versions` | `definition_json` | Search inside app definitions |
| `idx_gin_instance_context` | `workflow_instances` | `context_json` | Query runtime context |
| `idx_gin_submission_data` | `submissions` | `data_json` | Search submission values |
| `idx_gin_rule_condition` | `rules` | `condition_json` | Rule introspection |

**GIN index query examples**:
```sql
-- Find submissions where data contains a specific field value
SELECT * FROM submissions WHERE data_json @> '{"email": "user@example.com"}';

-- Find instances where context has a specific flag
SELECT * FROM workflow_instances WHERE context_json @> '{"approved": true}';
```

---

## 7. JSONB Column Contracts

### `application_versions.definition_json`

The immutable snapshot of the entire application at publish time:

```jsonc
{
  "workflows": [
    {
      "id": "uuid",
      "name": "Onboarding",
      "nodes": [
        {
          "id": "uuid",
          "type": "form",
          "label": "Personal Info",
          "config": { "formId": "uuid" }
        }
      ],
      "transitions": [
        {
          "id": "uuid",
          "sourceNodeId": "uuid",
          "targetNodeId": "uuid",
          "condition": null
        }
      ]
    }
  ],
  "forms": [
    {
      "id": "uuid",
      "name": "Personal Info",
      "fields": [
        { "key": "firstName", "type": "short-text", "label": "First Name", "required": true }
      ]
    }
  ],
  "rules": [
    {
      "id": "uuid",
      "name": "Age Check",
      "condition": { "field": "age", "operator": ">=", "value": 18 },
      "action": { "type": "route", "targetNodeId": "uuid" }
    }
  ],
  "screens": [],
  "metadata": {
    "publishedAt": "2026-03-18T00:00:00Z",
    "publishedBy": "uuid"
  }
}
```

### `workflow_instances.context_json`

Accumulated runtime state that grows as the workflow executes:

```jsonc
{
  "variables": {
    "firstName": "John",
    "age": 25,
    "approved": true
  },
  "history": ["node-uuid-1", "node-uuid-2"],
  "ruleResults": {
    "rule-uuid-1": { "matched": true, "evaluatedAt": "2026-03-18T10:00:00Z" }
  }
}
```

### `submissions.data_json`

Raw form submission values:

```jsonc
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "age": 25
}
```

### `rules.condition_json`

Rule engine condition tree (supports nesting):

```jsonc
{
  "operator": "AND",
  "conditions": [
    { "field": "age", "operator": ">=", "value": 18 },
    { "field": "country", "operator": "IN", "value": ["US", "MX", "CA"] }
  ]
}
```

### `rules.action_json`

What happens when the rule matches:

```jsonc
{
  "type": "route",           // or "set_variable", "notify", "reject"
  "targetNodeId": "uuid",    // for routing rules
  "variable": "riskLevel",   // for calculation rules
  "value": "high"
}
```

---

## 8. Migration Execution Guide

### Prerequisites

1. PostgreSQL 14+ running and accessible
2. A database created for the platform
3. The `uuid-ossp` and `pgcrypto` extensions available

### Step-by-Step Execution

#### Option A: Direct psql execution

```bash
# 1. Connect to your database
psql -h localhost -U postgres -d lowcode_platform

# 2. Run the migration
\i path/to/0001_initial_schema.sql

# 3. Verify tables were created
\dt

# 4. Verify indexes
\di

# 5. Verify constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, contype;
```

#### Option B: TypeORM migration integration

In your [typeorm.config.ts](backend/src/infrastructure/database/typeorm.config.ts), configure migrations:

```typescript
// typeorm.config.ts
import { DataSourceOptions } from 'typeorm';

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lowcode_platform',
  entities: [__dirname + '/../../modules/**/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,  // NEVER true in production
  logging: process.env.NODE_ENV !== 'production',
};
```

Then run:

```bash
# Generate TypeORM migration from entity changes (after aligning entities)
npx typeorm migration:run -d src/infrastructure/database/typeorm.config.ts
```

### Post-Migration Verification Checklist

```sql
-- 1. Count all tables (should be 15)
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. Verify all FK constraints
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- 3. Verify CHECK constraints
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;

-- 4. Verify triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- 5. Verify GIN indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public' AND indexdef LIKE '%gin%';
```

---

## 9. TypeORM Entity Alignment

Each table maps to a TypeORM entity. Here is the mapping and the changes needed in your existing entity files:

| Table | Entity File | Status |
|-------|------------|--------|
| `organizations` | `modules/organizations/entities/organization.entity.ts` | **Update**: add `settings_json`, `updated_at` |
| `users` | `modules/iam/entities/user.entity.ts` | **Update**: add all columns per schema |
| `applications` | `modules/applications/entities/application.entity.ts` | **Update**: add `description`, `is_archived`, `created_by`, `created_at`, `updated_at` |
| `application_versions` | `modules/applications/entities/application-version.entity.ts` | **Update**: change `definition_hash` to `char(64)`, add `created_at` |
| `workflows` | `modules/workflows/entities/workflow.entity.ts` | **Update**: add all columns, verify relations |
| `workflow_nodes` | `modules/workflows/entities/workflow-node.entity.ts` | **Update**: add `position_x`, `position_y`, `is_start_node`, `is_end_node`, timestamps |
| `workflow_transitions` | `modules/workflows/entities/workflow-transition.entity.ts` | **Update**: add `priority`, `label`, timestamps |
| `rules` | `modules/rules/entities/rule.entity.ts` | **Update**: add all columns per schema |
| `forms` | `modules/definitions/entities/form.entity.ts` | **Update**: align with schema |
| `screens` | `modules/definitions/entities/screen.entity.ts` | **Update**: align with schema |
| `components` | `modules/definitions/entities/component.entity.ts` | **Update**: add XOR parent, `sort_order` |
| `workflow_instances` | `modules/runtime/entities/workflow-instance.entity.ts` | **Update**: add `started_by`, `updated_at`, FK to `workflows` |
| `workflow_execution_logs` | `modules/runtime/entities/workflow-execution-log.entity.ts` | **Update**: add `actor_id` FK |
| `submissions` | **CREATE**: `modules/submissions/entities/submission.entity.ts` | **New file needed** |
| `telemetry_events` | **CREATE**: `modules/telemetry/entities/telemetry-event.entity.ts` | **New file needed** |

### Example Entity Template — `submission.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Application } from '../../applications/entities/application.entity';
import { WorkflowInstance } from '../../runtime/entities/workflow-instance.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'workflow_instance_id', nullable: true })
  workflowInstanceId: string | null;

  @ManyToOne(() => WorkflowInstance, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance: WorkflowInstance | null;

  @Column({ name: 'form_id', type: 'uuid', nullable: true })
  formId: string | null;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  nodeId: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'data_json', type: 'jsonb', default: '{}' })
  dataJson: Record<string, unknown>;

  @Column({ length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
```

### Example Entity Template — `telemetry-event.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('telemetry_events')
export class TelemetryEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'event_name', length: 150 })
  eventName: string;

  @Column({ name: 'event_category', length: 50 })
  eventCategory: 'workflow' | 'submission' | 'rule' | 'user_action' | 'system' | 'error';

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'entity_type', length: 80, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ name: 'metadata_json', type: 'jsonb', default: '{}' })
  metadataJson: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

---

## 10. Multi-Tenancy Pattern

### Current Approach: Application-Level Isolation

Every query MUST filter by `organization_id`. This is enforced at the service layer:

```typescript
// CORRECT — always scope by org
async findWorkflows(organizationId: string): Promise<Workflow[]> {
  return this.workflowRepo.find({
    where: { organizationId },
  });
}

// WRONG — leaks data across tenants
async findWorkflows(): Promise<Workflow[]> {
  return this.workflowRepo.find();
}
```

### Recommended Guard Pattern

Create a tenant context interceptor that extracts `organizationId` from the JWT and injects it:

```typescript
// Extract from JWT in every request
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.organizationId;
    if (!orgId) {
      throw new ForbiddenException('Missing organization context');
    }
    request.organizationId = orgId;
    return next.handle();
  }
}
```

### Future Enhancement: Row-Level Security (RLS)

When the platform grows, add PostgreSQL RLS for defense-in-depth:

```sql
-- Example: Enable RLS on workflow_instances
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON workflow_instances
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

---

## 11. Common Queries

### Get all active workflows for an application

```sql
SELECT w.id, w.name, w.description,
       count(wn.id) AS node_count
FROM workflows w
LEFT JOIN workflow_nodes wn ON wn.id = w.id
WHERE w.application_id = $1
  AND w.organization_id = $2
  AND w.is_active = true
GROUP BY w.id
ORDER BY w.name;
```

### Get the full workflow graph (nodes + transitions)

```sql
SELECT
  wn.id AS node_id, wn.node_type, wn.label, wn.config_json,
  wn.position_x, wn.position_y, wn.is_start_node, wn.is_end_node,
  wt.id AS transition_id, wt.source_node_id, wt.target_node_id,
  wt.condition_json, wt.priority, wt.label AS transition_label
FROM workflow_nodes wn
LEFT JOIN workflow_transitions wt ON wt.workflow_id = wn.workflow_id
WHERE wn.workflow_id = $1
  AND wn.organization_id = $2
ORDER BY wn.is_start_node DESC, wt.priority ASC;
```

### Get running workflow instances with current node info

```sql
SELECT wi.id, wi.status, wi.started_at, wi.context_json,
       wn.label AS current_node_label, wn.node_type AS current_node_type,
       u.display_name AS started_by_name
FROM workflow_instances wi
LEFT JOIN workflow_nodes wn ON wn.id = wi.current_node_id
LEFT JOIN users u ON u.id = wi.started_by
WHERE wi.organization_id = $1
  AND wi.status IN ('running', 'paused')
ORDER BY wi.started_at DESC
LIMIT 50;
```

### Get submission processing pipeline status

```sql
SELECT s.status, count(*) AS count,
       avg(EXTRACT(EPOCH FROM (s.processed_at - s.created_at))) AS avg_processing_secs
FROM submissions s
WHERE s.organization_id = $1
  AND s.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY s.status;
```

### Get workflow instance execution timeline

```sql
SELECT wel.event_type, wel.node_id, wn.label AS node_label,
       wel.payload_json, wel.created_at,
       u.display_name AS actor_name
FROM workflow_execution_logs wel
LEFT JOIN workflow_nodes wn ON wn.id = wel.node_id
LEFT JOIN users u ON u.id = wel.actor_id
WHERE wel.workflow_instance_id = $1
ORDER BY wel.created_at ASC;
```

### Dashboard telemetry aggregation

```sql
SELECT event_category,
       count(*) AS event_count,
       count(DISTINCT actor_id) AS unique_actors
FROM telemetry_events
WHERE organization_id = $1
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_category
ORDER BY event_count DESC;
```

---

## 12. Future Migrations Roadmap

These are enhancements to plan for after the initial schema is stable:

| Migration | Priority | Description |
|-----------|----------|-------------|
| `0002_rls_policies.sql` | High | Row-Level Security policies for all tenant-scoped tables |
| `0003_audit_log.sql` | High | Generic audit log table for GDPR/compliance (who changed what, when) |
| `0004_file_attachments.sql` | Medium | File upload metadata table linked to submissions and forms |
| `0005_notifications.sql` | Medium | Notification templates and delivery log |
| `0006_api_keys.sql` | Medium | External API key management per organization |
| `0007_partitioning.sql` | Low | Range-partition `workflow_execution_logs` and `telemetry_events` by `created_at` |
| `0008_full_text_search.sql` | Low | `tsvector` columns and GIN indexes for searching workflow/form names |
| `0009_materialized_views.sql` | Low | Pre-aggregated dashboard views for analytics |

### Migration Naming Convention

```
{sequence}_{description}.sql

Examples:
0001_initial_schema.sql
0002_rls_policies.sql
0003_add_audit_log.sql
```

Always run migrations sequentially. Never skip a number. Each migration must be idempotent (`IF NOT EXISTS`, `IF EXISTS`).

---

## Quick Reference Card

```
15 tables | 38 B-tree indexes | 4 GIN indexes | 11 auto-update triggers
6 CHECK constraints | 3 ON DELETE strategies | 1 XOR constraint | 1 self-loop prevention

Tenant root:     organizations
IAM:             users
Authoring:       applications → app_versions, workflows → nodes/transitions,
                 forms, screens, components, rules
Runtime:         workflow_instances → execution_logs, submissions
Observability:   telemetry_events
```
