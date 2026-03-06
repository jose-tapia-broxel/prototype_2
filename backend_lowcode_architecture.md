# Guía de implementación — Backend SaaS Low-Code (NestJS + PostgreSQL + Redis)

## 1) Objetivos y principios arquitectónicos

### Objetivo de plataforma
Diseñar un backend **multi-tenant, declarativo y event-driven** capaz de soportar miles de aplicaciones low-code creadas por usuarios técnicos y no técnicos.

### Principios clave
1. **Declarativo-first**: la fuente de verdad funcional de cada app es un JSON versionado.
2. **Versiones inmutables**: toda ejecución referencia una versión exacta de la app.
3. **Separación diseño vs runtime**: módulos de authoring y módulos de ejecución aislados.
4. **Event-driven interno**: cambios de estado y acciones relevantes emiten eventos de dominio.
5. **Escalabilidad horizontal**: workers stateless + coordinación vía DB/Redis.
6. **Observabilidad y auditoría completa** por tenant, aplicación, versión e instancia.

---

## 2) Arquitectura backend propuesta

### Vista lógica por dominios

- **IAM & Tenant**
  - Autenticación, usuarios, organizaciones, roles y políticas.
- **Application Definition (Authoring)**
  - CRUD de aplicaciones, validación JSON declarativo, versionado y publicación.
- **Runtime Engines**
  - Motor de formularios, reglas, navegación y workflows.
- **Execution Runtime**
  - Gestión de instancias, estado, transiciones, retries y compensaciones.
- **Integration Hub**
  - Conectores HTTP/Webhook/colas, credenciales seguras, mapeo de payloads.
- **Events & Telemetry**
  - Bus interno, telemetría de uso, logs de ejecución, auditoría.

### Estilo arquitectónico
- **NestJS modular monolith** inicialmente (rápido de evolucionar y operar).
- Evolución natural a microservicios por frontera (runtime/integrations/telemetry) cuando el throughput lo requiera.

### Componentes transversales
- **PostgreSQL**: persistencia transaccional y versionado.
- **Redis**:
  - Cache de definiciones publicadas.
  - Locks distribuidos para ejecución de nodos.
  - Rate limiting por tenant.
  - Pub/Sub ligero (si no se usa broker dedicado).
- **Queue (BullMQ con Redis)** para tareas asíncronas:
  - ejecución de nodos de workflow,
  - integraciones externas,
  - cálculo de métricas.

---

## 3) Estructura completa de proyecto NestJS

```txt
src/
  main.ts
  app.module.ts

  common/
    decorators/
      tenant-id.decorator.ts
      current-user.decorator.ts
    guards/
      jwt-auth.guard.ts
      tenant-access.guard.ts
    interceptors/
      request-context.interceptor.ts
    filters/
      http-exception.filter.ts
    pipes/
      zod-validation.pipe.ts
    utils/
      json-schema.util.ts
      pagination.util.ts
    constants/
      events.constants.ts

  infrastructure/
    config/
      configuration.ts
      validation.ts
    database/
      typeorm.config.ts
      migrations/
      seeds/
    cache/
      redis.module.ts
      redis.service.ts
    queue/
      queue.module.ts
      queue.service.ts

  modules/
    iam/
      iam.module.ts
      controllers/
        auth.controller.ts
        users.controller.ts
      services/
        auth.service.ts
        users.service.ts
      entities/
        user.entity.ts
        role.entity.ts
        permission.entity.ts

    organizations/
      organizations.module.ts
      controllers/organizations.controller.ts
      services/organizations.service.ts
      entities/organization.entity.ts

    applications/
      applications.module.ts
      controllers/
        applications.controller.ts
        app-versions.controller.ts
      services/
        applications.service.ts
        app-versioning.service.ts
        app-validation.service.ts
      entities/
        application.entity.ts
        application-version.entity.ts
      dto/

    definitions/
      definitions.module.ts
      services/
        definition-parser.service.ts
        definition-compiler.service.ts
      schemas/
        app-definition.schema.json

    forms/
      forms.module.ts
      controllers/forms.controller.ts
      services/forms-runtime.service.ts
      entities/form.entity.ts

    workflows/
      workflows.module.ts
      controllers/workflows.controller.ts
      services/
        workflow-designer.service.ts
        workflow-engine.service.ts
      entities/
        workflow.entity.ts
        workflow-node.entity.ts
        workflow-transition.entity.ts

    rules/
      rules.module.ts
      controllers/rules.controller.ts
      services/rules-engine.service.ts
      entities/rule.entity.ts

    navigation/
      navigation.module.ts
      services/navigation-engine.service.ts

    runtime/
      runtime.module.ts
      controllers/workflow-instances.controller.ts
      services/
        workflow-instance.service.ts
        execution-state.service.ts
      entities/
        workflow-instance.entity.ts
        workflow-execution-log.entity.ts

    events/
      events.module.ts
      services/domain-events.service.ts
      handlers/
        workflow-events.handler.ts
        telemetry-events.handler.ts

    telemetry/
      telemetry.module.ts
      controllers/telemetry.controller.ts
      services/telemetry.service.ts
      entities/usage-metric.entity.ts

    integrations/
      integrations.module.ts
      controllers/integrations.controller.ts
      services/
        integration-registry.service.ts
        http-connector.service.ts
      entities/
        integration-connector.entity.ts
        integration-call-log.entity.ts
```

---

## 4) Modelo declarativo (JSON) recomendado

### Estructura raíz (ejemplo)

```json
{
  "appKey": "sales-ops",
  "name": "Sales Operations",
  "screens": [
    { "id": "scr_home", "route": "/home", "components": ["cmp_1", "cmp_2"] }
  ],
  "components": [
    { "id": "cmp_1", "type": "Text", "props": { "value": "Hola" } }
  ],
  "forms": [
    { "id": "frm_lead", "fields": [{ "name": "email", "type": "email", "required": true }] }
  ],
  "workflows": [
    {
      "id": "wf_onboard",
      "nodes": [{ "id": "start", "type": "start" }, { "id": "approve", "type": "task" }],
      "transitions": [{ "from": "start", "to": "approve", "conditionRuleId": "rule_1" }]
    }
  ],
  "rules": [
    { "id": "rule_1", "engine": "jsonlogic", "expression": { ">": [{ "var": "lead.score" }, 70] } }
  ],
  "navigation": {
    "defaultScreenId": "scr_home",
    "guards": [{ "from": "scr_home", "to": "scr_admin", "ruleId": "rule_admin" }]
  },
  "actions": [
    { "id": "act_send_webhook", "type": "http", "config": { "url": "https://..." } }
  ]
}
```

### Pipeline de validación
1. Validación sintáctica (JSON Schema).
2. Validación semántica (referencias cruzadas, IDs únicos, DAG de workflow, rutas válidas).
3. Compilación a un **Runtime Snapshot** optimizado (índices por ID, grafo precompilado).
4. Firma/hash de versión (`definition_hash`) para inmutabilidad y cacheo.

---

## 5) Entidades de base de datos (TypeORM) — ejemplo

> Nota: se muestran ejemplos simplificados; en implementación real incluir índices compuestos, soft-delete y auditoría de cambios.

### `Organization`

```ts
// src/modules/organizations/entities/organization.entity.ts
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### `User`

```ts
// src/modules/iam/entities/user.entity.ts
@Entity('users')
@Index(['organizationId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ default: true })
  active: boolean;
}
```

### `Application` y `ApplicationVersion`

```ts
// src/modules/applications/entities/application.entity.ts
@Entity('applications')
@Index(['organizationId', 'appKey'], { unique: true })
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'app_key' })
  appKey: string;

  @Column()
  name: string;

  @Column({ name: 'current_published_version_id', type: 'uuid', nullable: true })
  currentPublishedVersionId?: string;
}

// src/modules/applications/entities/application-version.entity.ts
@Entity('application_versions')
@Index(['applicationId', 'versionNumber'], { unique: true })
export class ApplicationVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ name: 'status', type: 'varchar' }) // DRAFT | PUBLISHED | ARCHIVED
  status: string;

  @Column({ name: 'definition_json', type: 'jsonb' })
  definitionJson: Record<string, unknown>;

  @Column({ name: 'definition_hash', type: 'varchar', length: 128 })
  definitionHash: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;
}
```

### Entidades de diseño: `Screen`, `Component`, `Form`, `Workflow`, `WorkflowNode`, `WorkflowTransition`, `Rule`

```ts
@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'application_version_id', type: 'uuid' }) applicationVersionId: string;
  @Column({ name: 'screen_key' }) screenKey: string;
  @Column() name: string;
  @Column({ type: 'varchar' }) route: string;
  @Column({ name: 'schema_json', type: 'jsonb' }) schemaJson: any;
}

@Entity('components')
export class Component {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'application_version_id', type: 'uuid' }) applicationVersionId: string;
  @Column({ name: 'component_key' }) componentKey: string;
  @Column({ name: 'component_type' }) componentType: string;
  @Column({ name: 'props_json', type: 'jsonb' }) propsJson: any;
}

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'application_version_id', type: 'uuid' }) applicationVersionId: string;
  @Column({ name: 'form_key' }) formKey: string;
  @Column({ name: 'schema_json', type: 'jsonb' }) schemaJson: any;
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'application_version_id', type: 'uuid' }) applicationVersionId: string;
  @Column({ name: 'workflow_key' }) workflowKey: string;
  @Column() name: string;
}

@Entity('workflow_nodes')
export class WorkflowNode {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'workflow_id', type: 'uuid' }) workflowId: string;
  @Column({ name: 'node_key' }) nodeKey: string;
  @Column({ name: 'node_type' }) nodeType: string; // start|task|decision|integration|end
  @Column({ name: 'config_json', type: 'jsonb', nullable: true }) configJson?: any;
}

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'workflow_id', type: 'uuid' }) workflowId: string;
  @Column({ name: 'from_node_id', type: 'uuid' }) fromNodeId: string;
  @Column({ name: 'to_node_id', type: 'uuid' }) toNodeId: string;
  @Column({ name: 'condition_rule_id', type: 'uuid', nullable: true }) conditionRuleId?: string;
  @Column({ name: 'priority', type: 'int', default: 100 }) priority: number;
}

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'application_version_id', type: 'uuid' }) applicationVersionId: string;
  @Column({ name: 'rule_key' }) ruleKey: string;
  @Column({ name: 'engine', default: 'jsonlogic' }) engine: string;
  @Column({ name: 'expression_json', type: 'jsonb' }) expressionJson: any;
}
```

### Runtime: `WorkflowInstance` y `WorkflowExecutionLog`

```ts
@Entity('workflow_instances')
@Index(['organizationId', 'applicationVersionId', 'workflowId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'status', type: 'varchar' }) // RUNNING|WAITING|COMPLETED|FAILED|CANCELED
  status: string;

  @Column({ name: 'current_node_id', type: 'uuid', nullable: true })
  currentNodeId?: string;

  @Column({ name: 'context_json', type: 'jsonb', default: {} })
  contextJson: Record<string, unknown>;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;
}

@Entity('workflow_execution_logs')
@Index(['workflowInstanceId', 'createdAt'])
export class WorkflowExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_instance_id', type: 'uuid' })
  workflowInstanceId: string;

  @Column({ name: 'event_type' }) // NODE_ENTERED|RULE_EVALUATED|TRANSITION_TAKEN|ERROR|EXTERNAL_CALL
  eventType: string;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  nodeId?: string;

  @Column({ name: 'payload_json', type: 'jsonb', default: {} })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
```

---

## 6) Esquema relacional PostgreSQL (alto nivel)

### Relación principal
- `organizations (1) -> (N) users`
- `organizations (1) -> (N) applications`
- `applications (1) -> (N) application_versions`
- `application_versions (1) -> (N) screens/components/forms/workflows/rules`
- `workflows (1) -> (N) workflow_nodes/transitions`
- `workflow_instances (N) -> (1) application_versions`
- `workflow_execution_logs (N) -> (1) workflow_instances`

### Reglas de integridad clave
1. Solo una versión `PUBLISHED` activa por aplicación (constraint + transacción al publicar).
2. `workflow_instance.application_version_id` obligatorio e inmutable.
3. FK de todas las entidades de diseño hacia `application_versions`.
4. Índices por `organization_id` y `created_at` para consultas multi-tenant y auditoría.

### Estrategia de particionado recomendada
- `workflow_execution_logs` particionada por mes (`created_at`) y/o por hash de `organization_id` si volumen extremo.

---

## 7) Modelos de dominio (DDD-lite)

### Agregados
- **ApplicationAggregate**: `Application` + políticas de publicación/versionado.
- **DefinitionAggregate**: árbol declarativo compilado y validado.
- **WorkflowAggregate**: nodos + transiciones + invariantes de grafo.
- **WorkflowInstanceAggregate**: estado runtime + historial de transición.

### Value Objects
- `TenantId`, `AppVersionRef`, `RuleExpression`, `ExecutionContext`, `NodeResult`.

### Domain Services
- `DefinitionValidationService`
- `WorkflowExecutionService`
- `RuleEvaluationService`
- `NavigationResolutionService`

---

## 8) Módulos principales NestJS (responsabilidades)

1. **ApplicationsModule**
   - crear app, crear versión draft, publicar, listar versiones.
2. **DefinitionsModule**
   - parser/validador/compilador del JSON declarativo.
3. **FormsModule**
   - resolver esquemas de formularios por versión.
4. **RulesModule**
   - evaluar reglas (jsonlogic o CEL futuro).
5. **WorkflowsModule**
   - diseño y validación de grafo.
6. **RuntimeModule**
   - iniciar/reanudar/cancelar instancias.
7. **EventsModule**
   - bus interno + handlers desacoplados.
8. **TelemetryModule**
   - métricas por tenant, app, endpoint, workflow.

---

## 9) Ejemplo de servicio (versionado + publicación)

```ts
@Injectable()
export class AppVersioningService {
  constructor(
    private readonly versionsRepo: Repository<ApplicationVersion>,
    private readonly appsRepo: Repository<Application>,
    private readonly validation: AppValidationService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async publishVersion(organizationId: string, appId: string, versionId: string, actorId: string) {
    return this.versionsRepo.manager.transaction(async (trx) => {
      const version = await trx.findOneByOrFail(ApplicationVersion, { id: versionId, applicationId: appId });

      await this.validation.validateDefinition(version.definitionJson);

      await trx.update(
        ApplicationVersion,
        { applicationId: appId, status: 'PUBLISHED' },
        { status: 'ARCHIVED' },
      );

      version.status = 'PUBLISHED';
      version.publishedAt = new Date();
      await trx.save(version);

      await trx.update(Application, { id: appId, organizationId }, { currentPublishedVersionId: version.id });

      await this.domainEvents.emit('application.version.published', {
        organizationId,
        appId,
        versionId,
        actorId,
        publishedAt: version.publishedAt.toISOString(),
      });

      return version;
    });
  }
}
```

---

## 10) Ejemplo de motor de workflow (runtime)

```ts
@Injectable()
export class WorkflowEngineService {
  async runNext(instanceId: string): Promise<void> {
    // 1. lock distribuido (Redis SET NX PX)
    // 2. cargar instancia + snapshot de versión
    // 3. obtener nodo actual
    // 4. ejecutar acción del nodo (task/integration/decision)
    // 5. evaluar transiciones por prioridad y reglas
    // 6. persistir nuevo estado + log
    // 7. emitir evento workflow.node.completed
  }
}
```

---

## 11) Ejemplo de controlador y endpoints principales

```ts
@Controller('v1/organizations/:orgId/applications')
export class ApplicationsController {
  @Post()
  createApplication() {}

  @Get()
  listApplications() {}

  @Post(':appId/versions')
  createDraftVersion() {}

  @Post(':appId/versions/:versionId/validate')
  validateVersion() {}

  @Post(':appId/versions/:versionId/publish')
  publishVersion() {}
}

@Controller('v1/runtime/workflow-instances')
export class WorkflowInstancesController {
  @Post()
  startInstance() {}

  @Post(':instanceId/signal')
  sendSignal() {}

  @Post(':instanceId/cancel')
  cancelInstance() {}

  @Get(':instanceId')
  getInstance() {}

  @Get(':instanceId/logs')
  getExecutionLogs() {}
}
```

### Catálogo mínimo de endpoints
- `POST /v1/organizations/:orgId/applications`
- `GET /v1/organizations/:orgId/applications`
- `POST /v1/organizations/:orgId/applications/:appId/versions`
- `GET /v1/organizations/:orgId/applications/:appId/versions`
- `POST /v1/organizations/:orgId/applications/:appId/versions/:versionId/validate`
- `POST /v1/organizations/:orgId/applications/:appId/versions/:versionId/publish`
- `POST /v1/runtime/workflow-instances`
- `GET /v1/runtime/workflow-instances/:instanceId`
- `GET /v1/runtime/workflow-instances/:instanceId/logs`
- `POST /v1/runtime/workflow-instances/:instanceId/signal`
- `GET /v1/telemetry/usage?orgId=...&from=...&to=...`

---

## 12) Estrategia multi-tenant

### Recomendación
**Modelo shared-database + shared-schema + tenant_id** para fase inicial (eficiente operacionalmente).

### Medidas obligatorias
1. `organization_id` en todas las tablas de negocio runtime y authoring.
2. Guard/interceptor que inyecta `tenant context` desde JWT/API key.
3. Repositorios con filtros obligatorios por tenant (evitar fuga de datos).
4. Índices compuestos iniciando por `organization_id`.
5. En PostgreSQL, evaluar **RLS** (Row Level Security) para defensa en profundidad.

### Cuándo evolucionar
- Tenant premium o compliance fuerte → `schema-per-tenant` o `database-per-tenant` híbrido.

---

## 13) Manejo de eventos internos

### Eventos de dominio sugeridos
- `application.created`
- `application.version.created`
- `application.version.validated`
- `application.version.published`
- `workflow.instance.started`
- `workflow.node.entered`
- `workflow.rule.evaluated`
- `workflow.transition.taken`
- `workflow.instance.completed`
- `workflow.instance.failed`

### Implementación
- `@nestjs/event-emitter` para in-process.
- Para desacoplar y escalar: outbox pattern + worker publicador (Kafka/SNS/Rabbit futuro).

### Tabla outbox recomendada
- `event_outbox(id, organization_id, event_type, payload_json, status, created_at, published_at)`.

---

## 14) Sistema de versionado de aplicaciones

### Ciclo de vida
1. Crear `DRAFT` desde versión anterior o desde cero.
2. Editar definición JSON.
3. Validar (schema + semántica + compilación).
4. Publicar: versión pasa a `PUBLISHED` y previa `PUBLISHED` pasa a `ARCHIVED`.
5. Runtime solo ejecuta versiones `PUBLISHED` (o explicitamente referenciadas en tests).

### Inmutabilidad y trazabilidad
- `application_versions.definition_json` y `definition_hash` no mutan tras publicación.
- `workflow_instances` siempre guarda `application_version_id` fijo.
- Logs de ejecución guardan `node_id`, `event_type`, `payload_json` y timestamps.

---

## 15) Rendimiento, escalabilidad y resiliencia

1. **Cache de snapshots por versión** en Redis (`app:{versionId}:snapshot`).
2. **Optimistic locking** en instancias (`version` column) para evitar race conditions.
3. **Retries exponenciales** para nodos de integración.
4. **Dead letter queue** para ejecuciones fallidas no recuperables.
5. **Idempotency keys** en triggers externos/signal endpoints.
6. **Circuit breaker + timeout** en integraciones HTTP.
7. **Sharding lógico de colas** por tenant de alto volumen.

---

## 16) Telemetría y auditoría

### Métricas mínimas
- Latencia p50/p95 de endpoints.
- Tiempo promedio por nodo de workflow.
- Tasa de error por tipo de nodo/integración.
- Número de ejecuciones por tenant/app/versión.

### Auditoría
- Tabla `audit_logs` para acciones humanas (publicar versión, cambiar permisos, etc.).
- `workflow_execution_logs` para acciones automáticas de runtime.

---

## 17) Roadmap de implementación sugerido (MVP -> Escala)

### Fase 1 (MVP)
- IAM + Organizations + Applications + Versioning.
- Validación declarativa básica.
- Workflow runtime con nodos start/task/decision/end.
- Logs de ejecución.

### Fase 2
- Integraciones externas robustas.
- Reglas avanzadas + navegación declarativa.
- Telemetría avanzada y dashboards.

### Fase 3
- Outbox + broker dedicado.
- RLS estricta + capacidades enterprise multi-tenant.
- Optimización de particionado y archivado de logs.

---

## 18) Checklist de arranque técnico

1. Inicializar NestJS con módulos por dominio.
2. Configurar TypeORM + migraciones.
3. Crear entidades base (`Organization`, `User`, `Application`, `ApplicationVersion`).
4. Implementar validador JSON Schema y publicación versionada.
5. Implementar runtime mínimo de workflow + logs.
6. Añadir Redis para cache/locks/colas.
7. Integrar eventos de dominio + telemetría.
8. Endurecer multi-tenancy (guards + filtros + pruebas de aislamiento).

---

## 19) Decisiones arquitectónicas recomendadas (ADR iniciales)

- ADR-001: Multi-tenant con shared schema + `organization_id`.
- ADR-002: Versiones inmutables y publicación transaccional.
- ADR-003: Runtime event-driven con colas BullMQ.
- ADR-004: JSON declarativo con schema versionado y compilación a snapshot.
- ADR-005: Logs de ejecución append-only para auditoría.

---

Con esta base, el equipo puede comenzar implementación inmediata, manteniendo una trayectoria clara hacia escalabilidad masiva, robustez operativa y trazabilidad completa por tenant/app/versión/instancia.

---

## 20) Arquitectura de supervivencia para picos masivos (5 capas)

Para operar campañas masivas (ej. Super Bowl) sin caídas, el backend debe ejecutarse con cinco capas desacopladas:

1. **Frontend estático en CDN (Angular Engine)**
   - El frontend se entrega desde Edge (Cloudflare/CloudFront/Vercel).
   - Impacto sobre infraestructura backend: casi nulo en picos de tráfico.

2. **Lectura de JSON declarativo con caché Edge**
   - Las versiones publicadas son inmutables, por lo tanto cacheables de forma agresiva.
   - Endpoint recomendado: `GET /v1/public/workflows/versions/:versionId`.
   - Header recomendado: `Cache-Control: public, s-maxage=31536000, immutable`.

3. **Ingesta de submit desacoplada con colas (event-driven)**
   - Endpoint de entrada: `POST /v1/submissions` responde `202 Accepted`.
   - El payload se publica a cola (`submissions.ingest`) y no bloquea request de usuario.
   - Beneficio: absorción de bursts sin saturar la base principal.

4. **Integraciones y efectos secundarios en workers/serverless**
   - Workers consumen cola y ejecutan integraciones externas de forma asíncrona.
   - Retries, DLQ, idempotencia y circuit breakers se gestionan fuera de la ruta HTTP.

5. **Separación de persistencia por CQRS**
   - **DB de metadatos (PostgreSQL):** tenants, apps, versiones, reglas, workflows.
   - **DB de respuestas (NoSQL):** submissions a gran escala (DynamoDB/Mongo/BigQuery).
   - Beneficio: lectura/authoring con consistencia fuerte y escrituras masivas sin bloqueo relacional.

### Flujo de referencia durante un pico
1. Usuarios descargan Angular + JSON de workflow desde CDN/Edge.
2. Cliente evalúa reglas locales y envía submit.
3. API responde `202` y publica mensaje a cola.
4. Workers procesan en paralelo y escriben en NoSQL.
5. Telemetría y auditoría se consolidan de forma asíncrona.

Este patrón convierte la plataforma en una arquitectura **burst-tolerant** y reduce drásticamente la probabilidad de caída por picos repentinos.
