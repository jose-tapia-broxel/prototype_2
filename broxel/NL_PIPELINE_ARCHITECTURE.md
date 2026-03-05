# Arquitectura: lenguaje natural → motor JSON declarativo enterprise

## Objetivo
Permitir que usuarios de negocio describan un flujo en lenguaje natural y transformarlo, de forma trazable y validable, en artefactos del motor (`Steps`, `Rules`, `Integrations`) sin perder gobernanza técnica.

---

## 1) Pipeline de interpretación del texto

### Fase A. Ingesta y normalización
1. **Preprocesamiento lingüístico**
   - Detección de idioma, limpieza de ruido, expansión de abreviaturas de dominio.
   - Segmentación en oraciones y cláusulas para aislar condiciones, acciones y excepciones.
2. **Enriquecimiento de contexto**
   - Adjuntar metadatos: dominio, catálogo de pasos permitidos, conectores aprobados, políticas de seguridad.
   - Resolver referencias de negocio conocidas (por ejemplo, “aprobación” = proceso humano con SLA).

### Fase B. Comprensión semántica guiada
3. **Extracción estructurada asistida por LLM**
   - Prompt con esquema JSON estricto para extraer: actores, entidades, campos, validaciones, decisiones, side-effects.
   - Salida con *confidence scores* por elemento.
4. **Grounding contra catálogo interno**
   - Mapeo de términos libres a tipos canónicos (`FormStep`, `DecisionRule`, `HumanApprovalTask`, etc.).
   - Si hay ambigüedad: generar múltiples hipótesis rankeadas.

### Fase C. Construcción y compilación
5. **Construcción de intención intermedia (IR)**
   - Producir un modelo neutral (no acoplado al runtime final) con semántica explícita.
6. **Compilación IR → motor JSON**
   - Generar `Steps`, `Rules`, `Integrations` con trazabilidad por nodo (`source_span`, `rationale`).

### Fase D. Verificación y feedback
7. **Validación estática y semántica**
   - Chequeos de esquema, tipos, rutas, estados terminales, ciclos y permisos.
8. **Simulación de escenarios**
   - Ejecución en “dry-run” con casos sintéticos y de negocio.
9. **Explicación al usuario**
   - Resumen “esto entendí” + preguntas de aclaración solo donde la confianza sea baja.

---

## 2) Modelo de intención intermedio (IR)

Un IR útil debe ser:
- **Canónico**: independiente del proveedor LLM y del runtime.
- **Auditabile**: con trazas de origen.
- **Compilable**: transformable de forma determinística al JSON final.

### Propuesta de estructura IR (resumen)

```json
{
  "intent_id": "uuid",
  "version": "1.0",
  "source": {
    "text": "Necesito un formulario de registro...",
    "language": "es",
    "spans": []
  },
  "entities": {
    "data_model": [
      {"name": "edad", "type": "integer", "required": true}
    ],
    "actors": ["solicitante", "aprobador"]
  },
  "flow": {
    "steps": [
      {"id": "s1", "kind": "form", "label": "Registro", "fields": ["edad"]},
      {"id": "s2", "kind": "decision", "label": "Validar edad"},
      {"id": "s3", "kind": "human_approval", "label": "Aprobación de menor"},
      {"id": "s4", "kind": "complete", "label": "Finalizar"}
    ],
    "edges": [
      {"from": "s1", "to": "s2"},
      {"from": "s2", "to": "s3", "when": "edad < 18"},
      {"from": "s2", "to": "s4", "when": "edad >= 18"},
      {"from": "s3", "to": "s4", "when": "approved == true"}
    ]
  },
  "constraints": [
    {"type": "validation", "expr": "edad >= 0 && edad <= 120"}
  ],
  "integrations": [],
  "ambiguities": [],
  "confidence": {
    "global": 0.92,
    "by_node": {"s3": 0.81}
  }
}
```

### Campos críticos del IR
- `source.spans`: vínculo exacto entre frase original y nodo generado.
- `ambiguities`: lista de decisiones pendientes para interacción posterior.
- `confidence.by_node`: habilita revisión selectiva en vez de revisión total.

---

## 3) Mapeo de intención a Steps, Rules e Integraciones

## 3.1 Motor de mapeo por reglas declarativas
Usar una capa de transformación con tablas de mapeo versionadas:

- `IR.kind=form` → `Step(type="ui.form")`
- `IR.kind=decision` + `edges.when` → `Rule(type="expression")`
- `IR.kind=human_approval` → `Step(type="task.approval")`
- `IR.integration=email` → `Integration(type="smtp"|"api")`

Esto evita “prompt-only compilation” y mejora reproducibilidad.

## 3.2 Estrategia de Rules
1. Convertir expresiones del IR a AST tipado (ya sea engine propio o DSL).
2. Validar tipos (`edad` entero, comparaciones válidas).
3. Emitir regla ejecutable del motor JSON.

## 3.3 Estrategia de Integraciones
- Resolver integraciones por **catálogo corporativo** (nombre lógico → conector real).
- No permitir endpoints arbitrarios desde NL.
- Inyectar secretos desde vault por referencia, nunca texto plano.

## 3.4 Ejemplo para el caso dado
Entrada: “formulario de registro con validación de edad y aprobación si es menor de 18”.

- **Steps**
  1. `RegistroForm` (captura `edad`)
  2. `DecisionEdad` (branch)
  3. `AprobacionMenor` (tarea humana si `<18`)
  4. `Fin`
- **Rules**
  - `edad` obligatoria y rango válido.
  - Regla de ruteo: `edad < 18` → aprobación, si no → fin directo.
- **Integraciones**
  - Opcional: notificación a aprobador, auditoría, CRM.

---

## 4) Estrategia de validación automática

## 4.1 Validación multinivel
1. **Schema validation**: JSON final cumple contrato.
2. **Type validation**: campos/referencias/expresiones tipadas.
3. **Graph validation**:
   - Sin nodos huérfanos.
   - Hay al menos un estado terminal.
   - No hay ciclos no controlados.
4. **Policy validation**:
   - Paso de aprobación requiere rol autorizado.
   - Integraciones solo desde allowlist.
5. **Business validation**:
   - Reglas contradictorias (ej. `edad < 18` y `edad >= 18` mal priorizadas).

## 4.2 Testing automático generado
- **Golden tests** NL→IR→JSON para frases de referencia.
- **Property-based tests** en reglas críticas (edad límites 17/18/19).
- **Mutation tests** para asegurar que validaciones realmente fallan cuando deben.
- **Replay tests** con incidentes históricos anonimizados.

## 4.3 Runtime safeguards
- Modo `shadow` antes de publicar: comparar ejecución real vs esperada.
- Feature flags por flujo/version.
- Circuit breaker para integraciones externas.

---

## 5) Refinamiento iterativo

## 5.1 Ciclo de conversación controlado
1. Usuario describe necesidad.
2. Sistema responde con:
   - Diagrama resumido del flujo.
   - Supuestos detectados.
   - Preguntas mínimas de desambiguación.
3. Usuario corrige (“la aprobación debe ser del tutor legal”).
4. Sistema aplica **patch semántico** sobre IR, no regeneración completa.

## 5.2 Modelo de cambios
- Versionar IR y JSON final (`v1`, `v2`, ...).
- Registrar diffs semánticos:
  - `add_step`, `change_rule`, `replace_integration`.
- Mantener compatibilidad hacia atrás para instancias en curso.

## 5.3 UX técnica recomendada
- Panel doble:
  - izquierda: lenguaje natural + aclaraciones.
  - derecha: IR y JSON compilado con trazabilidad.
- “Explain this rule”: explicación NL de cada regla compilada.
- Botón “Probar escenarios” con simulación inmediata.

---

## Arquitectura de referencia (componentes)
- **NL Gateway**: entrada, autenticación, rate limiting.
- **Intent Extractor (LLM + prompts estructurados)**.
- **Ontology/Resolver Service**: grounding con catálogo corporativo.
- **IR Store**: versiones, diffs, auditoría.
- **Compiler Service**: IR → JSON engine.
- **Validator Service**: estático + semántico + políticas.
- **Simulator Service**: pruebas automáticas y what-if.
- **Feedback Orchestrator**: preguntas de aclaración y refinamiento.

Con esta separación, el LLM interpreta; pero la plataforma **decide y valida** con componentes determinísticos.
