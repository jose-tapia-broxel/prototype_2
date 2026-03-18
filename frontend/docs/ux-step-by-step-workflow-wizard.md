# Diseño UX — Asistente paso a paso para generar un workflow base

## Objetivo
Diseñar un wizard para **usuarios de negocio** que permita crear un workflow inicial sin lenguaje técnico, traduciendo respuestas a una estructura ejecutable (JSON), y mostrando una vista previa antes de publicar.

---

## 1) Secuencia ideal de preguntas (lenguaje no técnico)

> Principio UX: “preguntas cortas, una decisión por pantalla, ejemplos visibles”.

### Paso 0 — Contexto rápido
1. **¿Qué quieres lograr con este proceso?**
   - Ejemplos: “aprobar vacaciones”, “atender leads”, “gestionar reembolsos”.
2. **¿Dónde ocurre este proceso hoy?**
   - Opciones: Email / Planilla / CRM / WhatsApp / Otro.

### Paso 1 — Disparador (inicio)
3. **¿Qué evento inicia este proceso?**
   - Al recibir formulario, cuando llega un correo, en una fecha/hora, manual.
4. **¿Con qué frecuencia ocurre?**
   - Varias veces al día, diario, semanal, esporádico.

### Paso 2 — Actores y responsables
5. **¿Quién participa?**
   - Ventas, Finanzas, RR.HH., Soporte, Cliente, Proveedor.
6. **¿Quién decide o aprueba?**
   - Persona o rol.

### Paso 3 — Pasos principales
7. **¿Cuáles son los 3–5 pasos clave?**
   - UI guiada con verbos: Recibir → Revisar → Aprobar/Rechazar → Notificar → Registrar.
8. **¿Qué información necesitas en cada paso?**
   - Campos sugeridos por tipo: nombre, monto, fecha, prioridad, motivo.

### Paso 4 — Reglas de negocio
9. **¿Cuándo se toma una ruta distinta?**
   - “Si monto > X”, “si cliente es nuevo”, “si falta documento”.
10. **¿Qué debería pasar en cada caso?**
   - Aprobar directo, pedir más info, escalar, rechazar.

### Paso 5 — Integraciones
11. **¿Con qué herramientas quieres conectar este proceso?**
   - CRM, ERP, email, Slack/Teams, hoja de cálculo.
12. **¿Qué quieres hacer en cada herramienta?**
   - Crear registro, actualizar estado, enviar mensaje, adjuntar archivo.

### Paso 6 — Resultado y control
13. **¿Cómo sabrás que el proceso fue exitoso?**
   - SLA, tiempo medio, tasa de aprobación, % sin retrabajo.
14. **¿A quién hay que avisar al finalizar?**
   - Responsable, solicitante, canal de equipo.

### Paso 7 — Confirmación
15. **¿Quieres iniciar con configuración recomendada o personalizar más?**
   - “Recomendada” (rápido) vs “Avanzada” (detalle).

---

## 2) Decisiones condicionales dentro del wizard

> Principio UX: “mostrar solo lo necesario” (progressive disclosure).

### Árbol de decisiones sugerido

- Si el usuario elige **inicio manual**:
  - No mostrar frecuencia ni scheduler avanzado.
- Si elige **inicio por fecha/hora**:
  - Mostrar zona horaria, días hábiles, ventana horaria.
- Si dice que **hay aprobación**:
  - Pedir nivel de aprobación (1 nivel / multinivel).
  - Si multinivel, preguntar criterio de escalado (monto, área, urgencia).
- Si selecciona **integraciones externas**:
  - Mostrar mapeo simple “dato origen → campo destino”.
  - Si no hay integración, sugerir “empezar con notificación por email”.
- Si declara **alto volumen**:
  - Activar recomendaciones de automatización (validaciones automáticas, colas).
- Si marca **proceso sensible** (finanzas, datos personales):
  - Preguntar trazabilidad, auditoría, permisos por rol.

### Reglas de adaptación de experiencia
- **Lenguaje dinámico por dominio**: si el proceso es RR.HH., usar términos “colaborador/solicitud”; si es ventas, “lead/oportunidad”.
- **Plantillas inteligentes**: proponer blueprint por caso de uso (“Aprobación simple”, “Onboarding”, “Gestión de tickets”).
- **Asistencia contextual**: ejemplos en mini-cards según respuesta previa.

---

## 3) Cómo traducir respuestas en estructura JSON real

> Principio UX + técnico: el usuario describe el “qué”, el sistema construye el “cómo”.

### Modelo de transformación (pipeline)
1. **Captura de respuestas** en formato semántico (intención, actor, condición, acción).
2. **Normalización** (catálogo de verbos: revisar/aprobar/notificar).
3. **Enriquecimiento** con defaults de plantilla (timeouts, retries, nombres de estado).
4. **Compilación** a JSON ejecutable del workflow.
5. **Validación** de consistencia (sin pasos huérfanos, rutas cerradas, campos requeridos).

### Ejemplo de mapping respuesta → JSON

**Respuesta del usuario**
- “Cuando llega un formulario de reembolso, si el monto supera 500, aprueba finanzas; si no, aprueba líder; al final avisar por email.”

**JSON generado (ejemplo)**
```json
{
  "workflow": {
    "name": "Aprobación de reembolsos",
    "trigger": {
      "type": "form_submitted",
      "source": "reembolso_form"
    },
    "steps": [
      {
        "id": "validate_request",
        "type": "task",
        "owner": "operations",
        "action": "validate_fields"
      },
      {
        "id": "route_by_amount",
        "type": "decision",
        "rules": [
          {
            "when": "amount > 500",
            "next": "finance_approval"
          },
          {
            "when": "amount <= 500",
            "next": "leader_approval"
          }
        ]
      },
      {
        "id": "finance_approval",
        "type": "approval",
        "owner": "finance_manager",
        "next": "notify_requester"
      },
      {
        "id": "leader_approval",
        "type": "approval",
        "owner": "team_lead",
        "next": "notify_requester"
      },
      {
        "id": "notify_requester",
        "type": "integration",
        "provider": "email",
        "action": "send",
        "template": "reimbursement_status"
      }
    ],
    "outcomes": {
      "success": "approved_and_notified",
      "failure": "rejected_or_returned"
    }
  }
}
```

### Buenas prácticas de traducción
- Convertir términos libres a catálogos cerrados (p. ej. “avisar” → `integration/email/send`).
- Mantener `displayName` amigable y `id` técnico estable.
- Guardar `userIntent` para trazabilidad y futura explicación (“por qué se creó esta regla”).

---

## 4) Cómo mostrar preview antes de finalizar

> Principio UX: reducir incertidumbre antes de “publicar”.

### Preview de 3 capas
1. **Resumen ejecutivo (texto simple)**
   - “Cuando ocurra X, se ejecutarán 4 pasos. Si monto > 500 irá a Finanzas; si no, a Líder. Al final se notificará por email.”
2. **Vista visual del flujo (diagrama)**
   - Nodos + bifurcaciones con etiquetas legibles.
3. **Vista técnica opcional**
   - JSON generado (colapsable), para perfiles más avanzados.

### Controles clave en preview
- **Editar rápido** desde cada bloque (“Cambiar responsable”, “Ajustar regla”).
- **Checklist de calidad**:
  - ¿Tiene trigger?
  - ¿Todas las rutas terminan?
  - ¿Hay responsable por paso?
  - ¿Integraciones autenticadas?
- **Simulación** con 1–2 casos de prueba (“monto 200” vs “monto 900”).

### CTA final
- Botones: **Guardar borrador** / **Activar workflow**.
- Mensaje de seguridad: “Podrás desactivar o editar luego”.

---

## 5) Riesgos de sobre-simplificación (y mitigaciones)

1. **Ocultar demasiada complejidad**
   - Riesgo: reglas incompletas o ambiguas.
   - Mitigación: validaciones obligatorias y alertas de ambigüedad.

2. **Defaults incorrectos para casos especiales**
   - Riesgo: automatizaciones que no respetan políticas internas.
   - Mitigación: paso de revisión de políticas (auditoría, permisos, SLA).

3. **Lenguaje “demasiado simple” sin precisión operativa**
   - Riesgo: mala traducción al motor de ejecución.
   - Mitigación: confirmaciones explícitas (“Cuando dices ‘aprobar’, ¿quién aprueba?”).

4. **Exceso de confianza en generación automática**
   - Riesgo: usuario publica sin revisar impactos.
   - Mitigación: preview obligatorio + simulación mínima + checklist de publicación.

5. **Fatiga por preguntas si el wizard crece**
   - Riesgo: abandono.
   - Mitigación: modo recomendado (rápido), autocompletado por plantillas y guardado progresivo.

---

## Recomendación final para usuarios de negocio
- Empezar con una **plantilla por caso de uso**.
- Mantener el wizard en **8–10 pantallas máximo** con microcopy claro.
- Exigir una **preview entendible en lenguaje natural** antes de activar.
- Permitir evolución continua: “publica simple, mejora iterativamente”.
