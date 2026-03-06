# Backend Low-Code (NestJS)

Este backend vive en una carpeta independiente (`/backend`) para separar claramente frontend y runtime SaaS.

## Arquitectura objetivo en 5 capas estratégicas

1. **Frontend en CDN (Angular Engine):** app estática servida por Edge (Cloudflare/CloudFront/Vercel).
2. **Lectura de workflow JSON en caché Edge:** versiones publicadas inmutables (`GET /v1/public/workflows/versions/:versionId` con `Cache-Control` agresivo).
3. **Ingesta desacoplada por eventos:** `POST /v1/submissions` responde `202 Accepted` y publica a cola.
4. **Integraciones asíncronas con workers/serverless:** procesamiento fuera del request HTTP.
5. **CQRS de persistencia:** PostgreSQL para metadatos + store de respuestas (DynamoDB/Mongo/BigQuery) para alto volumen de escrituras.

## Qué incluye este scaffold

- Arquitectura modular por dominios en NestJS.
- Entidades TypeORM para:
  - Organization, User
  - Application, ApplicationVersion
  - Screen, Component, Form
  - Workflow, WorkflowNode, WorkflowTransition
  - Rule
  - WorkflowInstance, WorkflowExecutionLog
- Endpoints base para:
  - Authoring/versionado de aplicaciones
  - Lectura de definiciones publicadas cacheables
  - Ingesta masiva con patrón `202 + queue`
  - Ejecución y consulta de instancias de workflow
  - Telemetría básica

## Ejecutar local

```bash
cd backend
npm install
npm run start:dev
```

## Endpoints principales

- `POST /v1/organizations/:orgId/applications`
- `GET /v1/organizations/:orgId/applications`
- `POST /v1/organizations/:orgId/applications/:appId/versions`
- `POST /v1/organizations/:orgId/applications/:appId/versions/:versionId/publish`
- `GET /v1/public/workflows/versions/:versionId`
- `POST /v1/submissions` (HTTP 202)
- `POST /v1/runtime/workflow-instances`
- `GET /v1/runtime/workflow-instances/:instanceId`
- `GET /v1/runtime/workflow-instances/:instanceId/logs`
- `GET /v1/telemetry/usage`

## Siguiente paso recomendado

Conectar `QueuePublisherService` a SQS/Kafka/PubSub y `ResponseStoreService` a DynamoDB/MongoDB para completar la estrategia de picos masivos.
