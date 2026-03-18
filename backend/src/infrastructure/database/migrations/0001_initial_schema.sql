-- =============================================================
-- 0001_initial_schema.sql
-- Multi-tenant schema for authoring + runtime low-code platform
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1. ORGANIZATIONS (tenant root)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          varchar(120) UNIQUE NOT NULL,
  name          varchar(200) NOT NULL,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. USERS (IAM)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           varchar(255) NOT NULL,
  display_name    varchar(200) NOT NULL,
  role            varchar(50) NOT NULL DEFAULT 'viewer',
  is_active       boolean NOT NULL DEFAULT true,
  last_login_at   timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email),
  CONSTRAINT chk_users_role CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- ─────────────────────────────────────────────────────────────
-- 3. APPLICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_key                      varchar(120) NOT NULL,
  name                         varchar(200) NOT NULL,
  description                  text NULL,
  current_published_version_id uuid NULL,  -- FK added after application_versions exists
  is_archived                  boolean NOT NULL DEFAULT false,
  created_by                   uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at                   timestamptz NOT NULL DEFAULT NOW(),
  updated_at                   timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, app_key)
);

CREATE INDEX idx_apps_org ON applications(organization_id);
CREATE INDEX idx_apps_org_archived ON applications(organization_id, is_archived);

-- ─────────────────────────────────────────────────────────────
-- 4. APPLICATION VERSIONS (immutable snapshots)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_versions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version_number  int NOT NULL,
  status          varchar(20) NOT NULL DEFAULT 'draft',
  definition_json jsonb NOT NULL,
  definition_hash char(64) NOT NULL,  -- SHA-256 = exactly 64 hex chars
  created_by      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at    timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, version_number),
  CONSTRAINT chk_version_status CHECK (status IN ('draft', 'published', 'archived', 'rollback')),
  CONSTRAINT chk_version_number_positive CHECK (version_number > 0)
);

-- Now add the deferred FK from applications → application_versions
ALTER TABLE applications
  ADD CONSTRAINT fk_apps_current_version
  FOREIGN KEY (current_published_version_id)
  REFERENCES application_versions(id)
  ON DELETE SET NULL;

CREATE INDEX idx_versions_app ON application_versions(application_id);
CREATE INDEX idx_versions_org ON application_versions(organization_id);
CREATE INDEX idx_versions_status ON application_versions(application_id, status);

-- ─────────────────────────────────────────────────────────────
-- 5. WORKFLOWS (design-time definitions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            varchar(200) NOT NULL,
  description     text NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_app ON workflows(application_id);
CREATE INDEX idx_workflows_org ON workflows(organization_id);

-- ─────────────────────────────────────────────────────────────
-- 6. WORKFLOW NODES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  node_type       varchar(50) NOT NULL,
  label           varchar(200) NOT NULL,
  config_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_x      int NOT NULL DEFAULT 0,
  position_y      int NOT NULL DEFAULT 0,
  is_start_node   boolean NOT NULL DEFAULT false,
  is_end_node     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_node_type CHECK (
    node_type IN ('start', 'end', 'form', 'screen', 'decision', 'action', 'wait', 'parallel', 'sub_workflow')
  )
);

CREATE INDEX idx_nodes_workflow ON workflow_nodes(workflow_id);

-- ─────────────────────────────────────────────────────────────
-- 7. WORKFLOW TRANSITIONS (edges)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_transitions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_node_id  uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id  uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  condition_json  jsonb NULL,
  priority        int NOT NULL DEFAULT 0,
  label           varchar(200) NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_loop CHECK (source_node_id <> target_node_id)
);

CREATE INDEX idx_transitions_workflow ON workflow_transitions(workflow_id);
CREATE INDEX idx_transitions_source ON workflow_transitions(source_node_id);
CREATE INDEX idx_transitions_target ON workflow_transitions(target_node_id);

-- ─────────────────────────────────────────────────────────────
-- 8. RULES (business rule definitions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rules (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            varchar(200) NOT NULL,
  description     text NULL,
  rule_type       varchar(50) NOT NULL DEFAULT 'condition',
  condition_json  jsonb NOT NULL,
  action_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority        int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rule_type CHECK (rule_type IN ('condition', 'validation', 'calculation', 'routing'))
);

CREATE INDEX idx_rules_app ON rules(application_id);
CREATE INDEX idx_rules_org_active ON rules(organization_id, is_active);

-- ─────────────────────────────────────────────────────────────
-- 9. FORMS (definition-time form schemas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forms (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            varchar(200) NOT NULL,
  description     text NULL,
  schema_json     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by      uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forms_app ON forms(application_id);

-- ─────────────────────────────────────────────────────────────
-- 10. SCREENS (UI screens in the builder)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screens (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            varchar(200) NOT NULL,
  layout_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screens_app ON screens(application_id);

-- ─────────────────────────────────────────────────────────────
-- 11. COMPONENTS (reusable UI components within screens)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS components (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id       uuid NULL REFERENCES screens(id) ON DELETE CASCADE,
  form_id         uuid NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  component_type  varchar(80) NOT NULL,
  config_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_component_parent CHECK (
    (screen_id IS NOT NULL AND form_id IS NULL) OR
    (screen_id IS NULL AND form_id IS NOT NULL)
  )
);

CREATE INDEX idx_components_screen ON components(screen_id);
CREATE INDEX idx_components_form ON components(form_id);

-- ─────────────────────────────────────────────────────────────
-- 12. WORKFLOW INSTANCES (runtime execution)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_instances (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id          uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  application_version_id  uuid NOT NULL REFERENCES application_versions(id) ON DELETE RESTRICT,
  workflow_id             uuid NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
  current_node_id         uuid NULL REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  status                  varchar(20) NOT NULL DEFAULT 'pending',
  context_json            jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_by              uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  started_at              timestamptz NOT NULL DEFAULT NOW(),
  ended_at                timestamptz NULL,
  updated_at              timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_instance_status CHECK (
    status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX idx_instances_org ON workflow_instances(organization_id);
CREATE INDEX idx_instances_org_app_version ON workflow_instances(organization_id, application_version_id);
CREATE INDEX idx_instances_status ON workflow_instances(status);
CREATE INDEX idx_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX idx_instances_started ON workflow_instances(started_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 13. WORKFLOW EXECUTION LOGS (audit trail)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id  uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  event_type            varchar(100) NOT NULL,
  node_id               uuid NULL REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  actor_id              uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  payload_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_instance_created ON workflow_execution_logs(workflow_instance_id, created_at);
CREATE INDEX idx_logs_event_type ON workflow_execution_logs(event_type);
CREATE INDEX idx_logs_created_at ON workflow_execution_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 14. SUBMISSIONS (user input data)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id        uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  workflow_instance_id  uuid NULL REFERENCES workflow_instances(id) ON DELETE SET NULL,
  form_id               uuid NULL REFERENCES forms(id) ON DELETE SET NULL,
  node_id               uuid NULL REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  submitted_by          uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  data_json             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                varchar(20) NOT NULL DEFAULT 'pending',
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  processed_at          timestamptz NULL,
  CONSTRAINT chk_submission_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'rejected')
  )
);

CREATE INDEX idx_submissions_org ON submissions(organization_id);
CREATE INDEX idx_submissions_instance ON submissions(workflow_instance_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 15. TELEMETRY EVENTS (observability)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_name      varchar(150) NOT NULL,
  event_category  varchar(50) NOT NULL,
  actor_id        uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  entity_type     varchar(80) NULL,
  entity_id       uuid NULL,
  metadata_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_telemetry_category CHECK (
    event_category IN ('workflow', 'submission', 'rule', 'user_action', 'system', 'error')
  )
);

CREATE INDEX idx_telemetry_org_created ON telemetry_events(organization_id, created_at DESC);
CREATE INDEX idx_telemetry_event_name ON telemetry_events(event_name);
CREATE INDEX idx_telemetry_entity ON telemetry_events(entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────
-- JSONB INDEXES (for querying inside JSON columns)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_gin_version_definition ON application_versions USING gin(definition_json);
CREATE INDEX idx_gin_instance_context ON workflow_instances USING gin(context_json);
CREATE INDEX idx_gin_submission_data ON submissions USING gin(data_json);
CREATE INDEX idx_gin_rule_condition ON rules USING gin(condition_json);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER (auto-update timestamp)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'organizations', 'users', 'applications', 'workflows',
      'workflow_nodes', 'workflow_transitions', 'rules',
      'forms', 'screens', 'components', 'workflow_instances'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END;
$$;