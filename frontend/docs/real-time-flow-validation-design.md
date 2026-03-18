# Diseño práctico y escalable: validación en tiempo real para diseñador de flujos

## Objetivo
Construir un sistema de validación incremental que analice el JSON del flujo mientras el usuario edita, detecte problemas estructurales y semánticos, priorice por severidad y ofrezca autocorrecciones sin bloquear el trabajo creativo.

---

## 1) Motor de análisis estático del JSON

## 1.1 Modelo de datos interno (IR)
Antes de validar, convertir el JSON a una representación intermedia (IR) normalizada:

- `Flow { nodes, edges, variables, integrations, rules }`
- `Node { id, type, inputs, outputs, conditions, metadata }`
- `Edge { fromNodeId, toNodeId, predicate? }`
- `Rule { id, scope, expression, priority }`
- `IntegrationMapping { integrationId, sourceField, targetField, transform? }`

**Por qué IR:** desacopla el validador del formato exacto del JSON, facilita versionado y migraciones.

## 1.2 Pipeline del motor (por etapas)

1. **Parse + Schema Validation (rápido):** JSON parse, schema version, campos requeridos, tipos.
2. **Construcción de grafo:** nodos/edges en memoria + índices (`nodeById`, `incomingEdges`, `outgoingEdges`).
3. **Análisis estático incremental:** solo recalcular subgrafo impactado por edición.
4. **Post-procesado de diagnósticos:** deduplicación, severidad final, sugerencias.

## 1.3 Detectores clave

### A) Reglas contradictorias
Estrategia híbrida:

- **Nivel 1 (rápido):** detectar condiciones mutuamente excluyentes o superpuestas usando normalización booleana simple (`A && !A`, rangos disjuntos/solapados).
- **Nivel 2 (preciso, opcional):** traducir expresiones a SMT (ej. Z3) para verificar satisfacibilidad/intersección.

Ejemplo:
- Regla 1: `country == "MX"`
- Regla 2: `country != "MX"`
- Ambas con mismo scope + misma prioridad + acciones incompatibles ⇒ contradicción.

### B) Loops infinitos
En el grafo dirigido:

- Ejecutar **SCC (Tarjan/Kosaraju)** para ciclos.
- Para cada ciclo, validar condición de salida:
  - ¿Hay nodo de escape alcanzable?
  - ¿Existe contador/TTL/decremento?
  - ¿Las guardas del ciclo pueden volverse falsas?
- Si no hay evidencia de salida ⇒ riesgo de loop infinito.

### C) Campos nunca usados
Construir grafo de dependencia de datos:

- `defs` (dónde se define) y `uses` (dónde se consume).
- Marcar como “unused” campos definidos pero sin uso en nodos posteriores ni integraciones.
- Diferenciar “unused local” vs “unused global” para priorizar limpieza real.

### D) Integraciones mal mapeadas

- Validar mapeo contra contrato de integración (OpenAPI/JSON Schema): tipo, required, enum, formato.
- Detectar:
  - Campo fuente inexistente.
  - Tipo incompatible (`number`→`date` sin transform).
  - Campo requerido de destino sin mapear.
  - Transformación inválida o faltante.

## 1.4 Ejecución en tiempo real (arquitectura)

- **Worker thread** para no bloquear UI.
- **Debounce** corto (150–300ms) en ediciones continuas.
- **Incremental diff:** identificar nodos/edges afectados y recalcular reglas dependientes.
- **Cache de análisis** por hash de subárbol JSON.

---

## 2) Niveles de severidad

Propuesta mínima:

- **Error (bloqueante para publicar/ejecutar):**
  - Loop infinito altamente probable.
  - Requeridos de integración faltantes.
  - Referencias rotas (node/field inexistente).
  - Contradicción lógica que hace un branch imposible/crítico.

- **Warning (no bloqueante):**
  - Campo nunca usado.
  - Regla redundante o de baja cobertura.
  - Mapeo riesgoso con coerción implícita.

Opcional: agregar **Info** para higiene, pero mantener UI enfocada en `error/warning`.

---

## 3) Mostrar errores sin asustar al usuario

## Principios UX

1. **Progresivo, no punitivo:** no modal invasivo en cada tecla.
2. **Contextual:** mostrar el error junto al nodo/edge afectado.
3. **Accionable:** cada diagnóstico con “qué pasa” + “cómo arreglar”.
4. **Agrupado:** panel lateral con resumen por severidad y filtro.

## Interacciones recomendadas

- Badge discreto en canvas: `3 errores · 5 warnings`.
- Resaltado visual por nodo (rojo/ámbar), con tooltip breve.
- Panel “Problemas” con:
  - Mensaje humano.
  - Ruta (`Rule R-12`, `Node N-4`).
  - Botón “Ir al problema”.
  - Botón “Arreglar automáticamente” cuando aplique.

Microcopy sugerido:
- En lugar de “Error fatal”, usar: **“Este flujo podría no terminar. Te proponemos un límite de iteraciones.”**

---

## 4) Sugerencias de corrección automática

## Enfoque: quick-fixes deterministas
Cada regla de validación puede devolver `fixes[]`:

```ts
interface Diagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  location: JsonPath;
  fixes?: Fix[];
}

interface Fix {
  title: string;
  confidence: 'high' | 'medium';
  patch: JsonPatch[];
}
```

Ejemplos:

- **Loop infinito** → “Agregar guard `maxIterations: 100`”.
- **Campo requerido sin mapear** → autoseleccionar fuente compatible por nombre/tipo.
- **Tipo incompatible** → insertar transformación sugerida (`toString`, `parseDate`).
- **Campo nunca usado** → eliminar campo o sugerir conectarlo a nodo candidato.

Regla de seguridad:
- Autoaplicar solo fixes `confidence=high`.
- `confidence=medium` requiere confirmación del usuario.

---

## 5) Cómo evitar falsos positivos

1. **Niveles de confianza por detector**
   - `high`: evidencia formal (schema/SMT/contrato).
   - `medium`: heurística (nombres parecidos, inferencias de intención).

2. **Soporte de anotaciones del usuario**
   - Permitir `@intentional` / `suppress(code)` con caducidad/versionado.
   - Registrar quién y por qué se suprimió.

3. **Validación por contexto de ejecución**
   - Algunos loops son válidos si hay timeout externo.
   - Integrar metadata runtime (SLAs, retries máximos).

4. **Aprendizaje de telemetría**
   - Medir: fixes aceptados/rechazados, warnings ignorados.
   - Ajustar reglas con alta tasa de rechazo.

5. **Pruebas de regresión de reglas**
   - Suite con flujos reales anonimizados.
   - Cada nuevo detector debe pasar baseline de precisión.

---

## Blueprint técnico escalable

## Componentes

- `validator-core` (puro, sin UI): parser IR, rule engine, diagnostics.
- `validator-rules-*`: paquetes por dominio (grafo, lógica, integraciones, dataflow).
- `validator-worker`: ejecución incremental en background.
- `ui-diagnostics`: panel, badges, quick-fixes.

## Contratos estables

- `validate(flow, changedPaths?) -> Diagnostic[]`
- `applyFix(flow, fix) -> flow'`

## Rendimiento objetivo

- Flujo mediano (200 nodos):
  - validación incremental < 100ms p95
  - full validation < 500ms p95

## Escalabilidad de reglas

- Motor de reglas plugin-based:
  - cada regla define `id`, `dependsOn`, `run(context)`, `canFix`.
  - scheduler por dependencias para ejecutar solo lo necesario.

---

## Plan de implementación por fases

1. **Fase 1 (2–3 semanas):** schema, grafo, severidades, UI básica, 6 reglas críticas.
2. **Fase 2 (2 semanas):** incremental + worker + quick-fixes high confidence.
3. **Fase 3 (2 semanas):** SMT opcional para contradicciones complejas + métricas de precisión.
4. **Fase 4 (continuo):** tuning anti-falsos positivos con telemetría real.

Con este diseño obtienes feedback inmediato, bajo ruido y una base extensible para crecer el catálogo de validaciones sin degradar UX ni rendimiento.
