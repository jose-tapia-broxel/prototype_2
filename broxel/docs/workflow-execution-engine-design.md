# Diseño del motor de ejecución de workflows

## Objetivo
Diseñar un motor de ejecución robusto para workflows de negocio capaz de:

- ejecutar nodos de workflow;
- evaluar reglas;
- decidir transiciones;
- manejar estados;
- persistir progreso.

Tipos de nodos soportados:

- `START`
- `FORM`
- `API_CALL`
- `CONDITION`
- `APPROVAL`
- `TIMER`
- `END`

---

## 1) Modelo de ejecución

### 1.1 Principios

1. **Event-driven + stateful**: cada transición genera eventos persistidos.
2. **Token-based execution**: el flujo avanza mediante tokens activos sobre nodos.
3. **Determinismo**: con la misma definición + contexto + eventos, el resultado debe ser reproducible.
4. **Idempotencia**: reintentar una operación no debe duplicar efectos externos.
5. **Reanudable**: el motor puede reiniciar desde persistencia sin perder progreso.

### 1.2 Entidades de runtime

- **WorkflowDefinition**: grafo inmutable versionado (`nodes`, `transitions`).
- **WorkflowInstance**: ejecución concreta de una definición.
- **ExecutionToken**: puntero de ejecución en un nodo.
- **ExecutionContext**: datos de negocio que leen reglas y nodos.
- **OutboxEvent**: eventos de dominio para integración externa.

### 1.3 Semántica de nodos

- `START`: inicializa token principal y pasa al siguiente nodo.
- `FORM`: pausa la instancia hasta recibir `FORM_SUBMITTED`.
- `API_CALL`: ejecuta integración externa con política de reintentos.
- `CONDITION`: evalúa reglas y elige transición (primera que haga match o default).
- `APPROVAL`: pausa hasta recibir `APPROVED`/`REJECTED`.
- `TIMER`: agenda “despertador” (`resumeAt`) y pausa hasta timeout.
- `END`: consume token; si no quedan tokens activos, completa instancia.

### 1.4 Ciclo del motor (tick)

Cada **tick** procesa una unidad atómica de trabajo:

1. Cargar instancia + lock optimista.
2. Tomar token `READY`.
3. Ejecutar nodo.
4. Resolver transición(es).
5. Persistir estado + eventos en una transacción.
6. Publicar eventos vía outbox.

---

## 2) Estructuras de datos

### 2.1 Definición

```ts
export type NodeType = 'START' | 'FORM' | 'API_CALL' | 'CONDITION' | 'APPROVAL' | 'TIMER' | 'END';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config?: {
    formId?: string;
    api?: {
      integrationKey: string;
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      timeoutMs?: number;
      idempotencyKeyPath?: string;
    };
    condition?: {
      // AST compatible con rule-engine existente
      expressionAst?: unknown;
    };
    approval?: {
      mode: 'ANY' | 'ALL';
      approverGroups: string[];
      timeoutMs?: number;
    };
    timer?: {
      delayMs?: number;
      untilDatePath?: string; // ruta en contexto, e.g. "payment.dueAt"
    };
  };
}

export interface Transition {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  priority?: number;
  conditionAst?: unknown;
  isDefault?: boolean;
}
```

### 2.2 Instancia y tokens

```ts
export type InstanceStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUSPENDED';

export type TokenStatus = 'READY' | 'WAITING' | 'COMPLETED' | 'FAILED';

export interface ExecutionToken {
  id: string;
  nodeId: string;
  status: TokenStatus;
  waitReason?: 'FORM' | 'APPROVAL' | 'TIMER' | 'RETRY_BACKOFF';
  resumeAt?: string;
  retryCount: number;
  lastErrorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  workflowKey: string;
  definitionId: string;
  status: InstanceStatus;
  context: Record<string, unknown>;
  tokens: ExecutionToken[];
  version: number; // optimistic lock
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

### 2.3 Eventos de ejecución

```ts
export type ExecutionEventType =
  | 'INSTANCE_STARTED'
  | 'NODE_ENTERED'
  | 'NODE_WAITING'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'TRANSITION_TAKEN'
  | 'RETRY_SCHEDULED'
  | 'INSTANCE_COMPLETED'
  | 'INSTANCE_FAILED';

export interface ExecutionEvent {
  id: string;
  instanceId: string;
  tokenId?: string;
  nodeId?: string;
  type: ExecutionEventType;
  payload?: Record<string, unknown>;
  createdAt: string;
}
```

---

## 3) Algoritmo de ejecución

### 3.1 Arranque de instancia

1. Validar definición activa.
2. Crear instancia `CREATED`.
3. Insertar token inicial en nodo `START` con estado `READY`.
4. Emitir `INSTANCE_STARTED`.
5. Encolar job `execute(instanceId)`.

### 3.2 Bucle principal (worker)

Pseudo-código:

```text
while (true):
  instance = loadAndLock(instanceId)
  token = pickNextReadyToken(instance)
  if !token:
    recalculateInstanceStatus(instance)
    save(instance)
    break

  node = getNode(definition, token.nodeId)
  emit(NODE_ENTERED)

  result = executeNode(node, instance.context, token)

  switch result.kind:
    AUTO_ADVANCE:
      transitions = resolveTransitions(node, context)
      moveToken(token, transitions)
      emit(TRANSITION_TAKEN)
    WAIT:
      token.status = WAITING
      token.waitReason = result.reason
      token.resumeAt = result.resumeAt
      emit(NODE_WAITING)
    FAIL:
      handleFailure(instance, token, result.error)

  save(instance + events) // transaccional
```

### 3.3 `executeNode` por tipo

- `START`: devuelve `AUTO_ADVANCE`.
- `FORM`: devuelve `WAIT(reason=FORM)`.
- `APPROVAL`: devuelve `WAIT(reason=APPROVAL)`.
- `TIMER`: calcula `resumeAt`, agenda timer y devuelve `WAIT(reason=TIMER)`.
- `API_CALL`:
  - construye request con contexto;
  - aplica idempotency key;
  - ejecuta integración con timeout;
  - si éxito, fusiona respuesta en contexto y `AUTO_ADVANCE`;
  - si error recuperable, delega a retry;
  - si error fatal, `FAIL`.
- `CONDITION`:
  - evalúa condiciones de transiciones (orden por `priority`);
  - usa primera true;
  - si ninguna true usa `isDefault`;
  - si no existe ruta, `FAIL(ROUTING_NO_MATCH)`.
- `END`: marca token `COMPLETED`; si todos completos -> instancia `COMPLETED`.

### 3.4 Decisión de transición

- Resolver salidas de `fromNodeId`.
- Ordenar por `priority ASC`.
- Evaluar `conditionAst` contra `context`.
- Tomar la primera transición válida.
- Registrar `TRANSITION_TAKEN` con evidencia (`condition`, valor, transición).

---

## 4) Manejo de errores

### 4.1 Taxonomía

- **Errores de negocio**: validación de datos, falta de aprobación, regla inválida.
- **Errores técnicos recuperables**: timeout, 429, 5xx, red.
- **Errores técnicos no recuperables**: 4xx fatal, credenciales inválidas, nodo mal configurado.
- **Errores de motor**: inconsistencia de grafo, token huérfano, conflicto de versión repetido.

### 4.2 Estrategia

1. Clasificar error.
2. Si recuperable: programar retry.
3. Si no recuperable: marcar token `FAILED` e instancia `FAILED` (o enviar a rama de compensación si existe).
4. Persistir `NODE_FAILED` con `errorCode`, `message`, `stackRef`.
5. Emitir evento para observabilidad/alertas.

### 4.3 Consistencia

- Guardado de estado y eventos en **una sola transacción**.
- Publicación externa vía **Outbox Pattern** para evitar pérdida de eventos.
- Control de concurrencia por `version` + reintento por conflicto optimista.

---

## 5) Manejo de reintentos

### 5.1 Política base

- Configurable por nodo `API_CALL` y opcionalmente global:
  - `maxAttempts` (ej. 5)
  - `initialDelayMs` (ej. 1000)
  - `backoffFactor` (ej. 2)
  - `maxDelayMs` (ej. 60000)
  - `jitter` (0–20%)

### 5.2 Cálculo de backoff

```text
delay = min(maxDelayMs, initialDelayMs * backoffFactor^(attempt-1))
delay = delay +/- jitter
resumeAt = now + delay
```

### 5.3 Comportamiento

- Si `attempt < maxAttempts`:
  - `token.status = WAITING`
  - `waitReason = RETRY_BACKOFF`
  - `resumeAt = ...`
  - evento `RETRY_SCHEDULED`
- Si excede máximos:
  - `token.status = FAILED`
  - `instance.status = FAILED`
  - evento `INSTANCE_FAILED`

### 5.4 Idempotencia

- `API_CALL` debe incluir `idempotencyKey` derivada de:
  - `instanceId`
  - `tokenId`
  - `nodeId`
  - `attempt`
- Persistir request hash y response hash para auditoría.

---

## 6) Persistencia de estado

### 6.1 Modelo de almacenamiento (mínimo)

Tablas/colecciones sugeridas:

1. `workflow_definitions`
2. `workflow_nodes`
3. `workflow_transitions`
4. `workflow_instances`
5. `workflow_tokens`
6. `workflow_events` (event store ligero)
7. `outbox_events`
8. `scheduled_jobs` (timers + retries)

### 6.2 Operaciones transaccionales críticas

- **Advance token**:
  - update token(s)
  - update instance/status/version
  - insert execution events
  - insert outbox events
- **External resume event** (`FORM_SUBMITTED`, `APPROVED`, timer fired):
  - validar correlación (`instanceId`, `tokenId`, `nodeId`)
  - evitar duplicados por `dedupeKey`
  - mover token a `READY`
  - encolar ejecución

### 6.3 Recuperación tras caída

Al reiniciar workers:

1. Buscar tokens `WAITING` con `resumeAt <= now` y encolarlos.
2. Reintentar publicaciones pendientes en outbox.
3. Ejecutar reconciliador para instancias `RUNNING` sin actividad reciente.

---

## 7) Manejo de eventos

### 7.1 Eventos de entrada (externos)

- `FORM_SUBMITTED`
- `APPROVAL_DECIDED`
- `TIMER_FIRED`
- `INSTANCE_CANCELLED`
- `INSTANCE_SUSPENDED`
- `INSTANCE_RESUMED`

Todos deben ser:

- autenticados/autorizados;
- idempotentes (`eventId` único);
- correlacionados por `instanceId/tokenId`.

### 7.2 Eventos de salida (dominio)

- `workflow.instance.started`
- `workflow.node.waiting`
- `workflow.node.completed`
- `workflow.node.failed`
- `workflow.instance.completed`
- `workflow.instance.failed`

Se publican desde outbox hacia bus (Kafka/SNS/Rabbit/etc).

### 7.3 Contrato de evento (ejemplo)

```json
{
  "eventId": "evt_01J...",
  "type": "workflow.node.failed",
  "timestamp": "2026-01-15T12:00:00.000Z",
  "instanceId": "inst_123",
  "tokenId": "tok_456",
  "nodeId": "node_api_1",
  "workflowKey": "onboarding_cliente",
  "payload": {
    "errorCode": "HTTP_TIMEOUT",
    "attempt": 3,
    "maxAttempts": 5
  }
}
```

---

## Recomendaciones de implementación incremental

### Fase 1 (MVP)

- Soporte completo para `START`, `FORM`, `CONDITION`, `END`.
- Persistencia de instancia/tokens/eventos.
- `FORM_SUBMITTED` + evaluación de reglas + transiciones.

### Fase 2

- `API_CALL` con retries + outbox + idempotencia.
- `APPROVAL` con timeout y escalamiento básico.

### Fase 3

- `TIMER` robusto con scheduler distribuido.
- observabilidad avanzada (métricas por nodo, latencias, tasa de fallo por integración).
- capacidades de replay/reprocess con snapshots.

---

## Checklist de validación del motor

- [ ] Ningún nodo (excepto `END`) queda sin transición válida.
- [ ] Toda ruta de `CONDITION` tiene default o cobertura total.
- [ ] Reintentos no duplican efectos en `API_CALL`.
- [ ] Reinicio del worker no pierde progreso.
- [ ] Eventos externos duplicados no re-ejecutan el nodo.
- [ ] Cada cambio relevante deja traza en `workflow_events`.
