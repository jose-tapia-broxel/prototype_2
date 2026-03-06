-- Esquema base multi-tenant para authoring + runtime.
-- Nota: plantilla inicial para adaptar a Flyway/TypeORM migrations.

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  slug varchar(120) UNIQUE NOT NULL,
  name varchar(200) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  app_key varchar(120) NOT NULL,
  name varchar(200) NOT NULL,
  current_published_version_id uuid NULL,
  UNIQUE (organization_id, app_key)
);

CREATE TABLE IF NOT EXISTS application_versions (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  version_number int NOT NULL,
  status varchar(20) NOT NULL,
  definition_json jsonb NOT NULL,
  definition_hash varchar(128) NOT NULL,
  created_by uuid NOT NULL,
  published_at timestamptz NULL,
  UNIQUE (application_id, version_number)
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  application_id uuid NOT NULL REFERENCES applications(id),
  application_version_id uuid NOT NULL REFERENCES application_versions(id),
  workflow_id uuid NOT NULL,
  status varchar(20) NOT NULL,
  current_node_id uuid NULL,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id uuid PRIMARY KEY,
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id),
  event_type varchar(100) NOT NULL,
  node_id uuid NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_org ON applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_versions_app ON application_versions(application_id);
CREATE INDEX IF NOT EXISTS idx_instances_org_app_version ON workflow_instances(organization_id, application_version_id);
CREATE INDEX IF NOT EXISTS idx_logs_instance_created ON workflow_execution_logs(workflow_instance_id, created_at);
