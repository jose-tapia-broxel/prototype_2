# Estrategia de UX simplificada para capacidades enterprise

## Objetivo
Exponer capacidades enterprise sin sobrecargar al usuario, reduciendo fricción cognitiva mediante:
- **Progresive disclosure** (mostrar complejidad solo cuando aporta valor).
- **Defaults seguros** (que el estado por defecto sea útil y difícil de romper).
- **Rutas guiadas** (tareas, no configuración técnica).
- **Guardrails** (validaciones, permisos, reversibilidad).

---

## 1) Estrategia de niveles: Simple / Avanzado / Developer

### Nivel 1: **Simple** (orientado a resultado)
**Para quién:** usuarios de negocio, operaciones, analistas no técnicos.

**Principios de UI:**
- Interfaz basada en **objetivos** y plantillas (“Quiero automatizar X”).
- Máximo 5–7 decisiones por flujo.
- Lenguaje no técnico.
- Campos avanzados ocultos por defecto.

**Promesa de experiencia:** “Lo logras rápido, con mínimo riesgo”.

### Nivel 2: **Avanzado** (orientado a control)
**Para quién:** power users, admins funcionales.

**Principios de UI:**
- Se habilitan paneles de configuración intermedia.
- Vistas comparativas (antes/después) y simulación.
- Configuración por módulos con presets editables.

**Promesa de experiencia:** “Puedes ajustar comportamiento sin entrar a código”.

### Nivel 3: **Developer** (orientado a extensibilidad)
**Para quién:** equipos técnicos, ingeniería, integradores.

**Principios de UI:**
- Acceso a configuración completa, APIs, hooks, scripts, versionado.
- Observabilidad técnica (logs detallados, tracing, métricas crudas).
- Entorno sandbox y control de despliegue.

**Promesa de experiencia:** “Control total con herramientas de ingeniería”.

---

## 2) Qué features deben estar en cada nivel

## Matriz de capacidades por nivel
| Dominio | Simple | Avanzado | Developer |
|---|---|---|---|
| Onboarding | Wizard guiado por casos de uso | Wizard + elección de arquitectura funcional | Bootstrap técnico (SDK/API, plantillas IaC) |
| Configuración | Presets bloqueados y recomendados | Presets editables por módulo | Config raw (YAML/JSON), flags completos |
| Integraciones | Conectores preconfigurados (OAuth, clics) | Mapeo de campos + reglas | API/SDK, webhooks custom, scripts |
| Automatización | Flujos prearmados | Reglas condicionales visuales | Engine avanzado, expresiones/código |
| Seguridad | Roles básicos predefinidos | Matriz de permisos granular | Políticas avanzadas, ABAC/RBAC extendido |
| Publicación | “Publicar” con checklist simple | Deploy por entorno con validaciones | Pipelines CI/CD, canary, rollback programático |
| Observabilidad | KPIs clave y alertas legibles | Dashboards configurables | Logs completos, tracing, export a SIEM |
| Soporte | Asistente contextual + recomendaciones | Diagnóstico guiado | Debug técnico y herramientas CLI |

## Criterio para decidir dónde va una feature
Una feature debe estar en **Simple** solo si cumple todo:
1. Impacto alto en valor de negocio.
2. Baja probabilidad de daño.
3. Curva de aprendizaje corta.
4. Puede expresarse sin jerga técnica.

Si falla alguno, mover a **Avanzado** o **Developer** con guardrails.

---

## 3) Cómo transicionar entre niveles sin perder datos

## Modelo de transición recomendado
1. **Fuente única de verdad:** almacenar siempre una configuración canónica completa.
2. **Vistas por nivel:** cada nivel es una “proyección” de esa configuración, no copias separadas.
3. **Metadatos de compatibilidad:** marcar campos como:
   - `editable_in_simple`
   - `editable_in_advanced`
   - `developer_only`
4. **Round-trip seguro:** al subir de nivel, se revela más detalle; al bajar de nivel, no se elimina nada, solo se oculta o se bloquea edición.

## Reglas de UX al cambiar de nivel
- Mostrar diff legible: “Vas a desbloquear X controles”.
- Crear snapshot automático antes del cambio.
- Permitir “volver al nivel anterior” sin pérdida.
- Si hay campos incompatibles para nivel inferior:
  - mantener valores,
  - bloquear edición,
  - explicar impacto en lenguaje simple.

## Patrón técnico útil
- Guardar `config.raw` (completa) + `config.view(level)` (derivada).
- Versionar configuraciones (`v1`, `v2`...) con migraciones declarativas.
- Validar consistencia en cada save/upgrade/downgrade.

---

## 4) Cómo evitar que usuarios inexpertos rompan configuraciones

## Guardrails esenciales
1. **Permisos por capacidad, no solo por rol**
   - Acciones críticas (borrar, desactivar seguridad, cambiar producción) requieren permiso explícito.
2. **Entornos separados**
   - Sandbox / Staging / Producción con promoción controlada.
3. **Validación preventiva**
   - Validaciones en tiempo real + preflight check antes de guardar/publicar.
4. **Confirmaciones inteligentes**
   - Para acciones de alto riesgo, confirmar con impacto concreto (“Esto afectará 12 automatizaciones”).
5. **Rollback de 1 clic**
   - Historial de versiones con restauración inmediata.
6. **Límites seguros por defecto**
   - Rate limits, timeout, cuotas y thresholds predefinidos.
7. **Diseño anti-error**
   - Deshabilitar opciones incompatibles en vez de mostrar error tardío.
8. **Modo recomendación**
   - “Recomendado por plataforma” visible como default y recuperable.

## UX copy para reducir errores
- Cambiar copy técnico por copy orientado a consecuencia.
- Ejemplo:
  - En vez de: “Desactivar validación síncrona”.
  - Usar: “Permitir datos sin validar (puede degradar calidad de reportes)”.

---

## 5) Métricas para validar simplicidad (foco cognitivo)

## Métricas de fricción cognitiva
1. **Time-to-First-Value (TTFV)**
   - Tiempo desde registro hasta primer resultado útil.
2. **Task Success Rate por nivel**
   - % de usuarios que completan tareas clave sin asistencia.
3. **Error Rate por flujo**
   - Errores de validación, reversión y abandonos por paso.
4. **Backtracking Rate**
   - Frecuencia con la que usuarios vuelven atrás en un wizard.
5. **Configuración tocada por sesión**
   - Número de campos editados para lograr una tarea (menos es mejor si mantiene resultados).
6. **Escalation-to-Advanced/Developer ratio**
   - Cuándo y por qué un usuario necesita subir de nivel.
7. **Rollback Frequency**
   - Cuántas veces se revierte una configuración tras publicación.
8. **Support tickets por 100 cuentas activas**
   - Especialmente tickets “no entiendo qué hace esta opción”.
9. **Perceived Ease Score**
   - Encuesta in-product (1–5): “Fue fácil lograr lo que necesitaba”.

## Umbrales sugeridos (iniciales)
- TTFV Simple < 15 min.
- Task success en Simple > 85%.
- Error rate crítico < 3%.
- Backtracking en flujos core < 20%.
- Rollback post-release < 5%.

---

## Recomendación de implementación por fases

### Fase 1 (rápida, 2–4 semanas)
- Introducir selector de nivel global.
- Ocultar opciones avanzadas por defecto.
- Agregar presets y copy orientado a tareas.
- Instrumentar métricas base (TTFV, success, error).

### Fase 2 (4–8 semanas)
- Config canónica + vistas por nivel.
- Snapshots, diff y rollback.
- Validaciones preflight y guardrails de publicación.

### Fase 3 (8–12 semanas)
- Recomendador contextual de nivel (“Parece que necesitas Avanzado para X”).
- Nudges inteligentes para volver a Simple cuando aplique.
- Experimentación A/B de flujos y copy.

---

## Heurística final de diseño
Si una opción requiere explicación larga para ser usada correctamente, **no pertenece al nivel Simple**. Debe moverse a Avanzado/Developer o transformarse en un preset seguro.
