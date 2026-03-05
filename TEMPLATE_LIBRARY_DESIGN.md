# Template Library SaaS — Enfoque en simplicidad y adopción

## Objetivo del producto
Diseñar una librería de templates que ayude a cualquier usuario (incluyendo no técnicos) a pasar de “no sé por dónde empezar” a “flujo listo para usar” en menos de 5 minutos.

---

## 1) Categorías estratégicas de templates

Las categorías deben mapearse con **intención de negocio** (lo que el usuario quiere lograr) y no con tecnología.

### A. Captación y conversión
- Landing + formulario de lead
- Registro a demo
- Lead magnet (ebook/webinar)
- Encuesta de calificación inicial

**Por qué existe:** es la necesidad más frecuente en SaaS B2B y B2C.

### B. Onboarding de cliente
- Bienvenida por email + checklist
- Activación de cuenta por hitos
- Secuencia de primeros 7 días
- Recolección de datos iniciales

**Por qué existe:** reduce churn temprano y mejora time-to-value.

### C. Ventas y seguimiento
- Recordatorio de propuesta
- Seguimiento post demo
- Reactivación de oportunidades frías
- Pipeline con tareas automáticas

**Por qué existe:** transforma trabajo manual repetitivo en sistema.

### D. Soporte y éxito del cliente
- Recepción y triage de tickets
- Cierre de ticket + solicitud de CSAT
- Escalamiento interno por SLA
- Base de ayuda sugerida automáticamente

**Por qué existe:** impacta directamente satisfacción y retención.

### E. Retención y expansión
- Campañas de reactivación
- Upsell/cross-sell por comportamiento
- Renewal reminder
- Programas de fidelización

**Por qué existe:** maximiza LTV sin adquirir nuevos usuarios.

### F. Operación interna
- Aprobaciones internas (legal/finanzas)
- Solicitudes de vacaciones/IT
- Notificaciones entre equipos
- Flujos de handoff entre áreas

**Por qué existe:** gana adopción en equipos no comerciales.

### G. Categoría “Quick Wins” (entrada principal)
- Top 10 templates más usados
- “Listo en 3 pasos”
- “Sin integraciones requeridas”
- “Impacto inmediato”

**Por qué existe:** acelera decisión y reduce fricción de elección.

---

## 2) Estructura interna de un template (qué debe incluir)

Cada template debe tener una estructura estándar para consistencia:

1. **Nombre orientado a resultado**
   - Ejemplo: “Recuperar leads inactivos en 7 días”

2. **Problema que resuelve (1 frase)**
   - “Si tus leads dejan de responder, este flujo los reengancha automáticamente.”

3. **Cuándo usarlo / cuándo no usarlo**
   - Evita mala implementación por contexto incorrecto.

4. **Tiempo estimado de activación**
   - “4 min” visible antes de abrir.

5. **Dificultad (Básico / Intermedio / Avanzado)**
   - Para generar confianza y auto-selección.

6. **Requisitos previos mínimos**
   - Datos necesarios, integraciones opcionales/obligatorias.

7. **Blueprint visual del flujo**
   - 3–7 bloques máximo en versión inicial.

8. **Variables editables predefinidas**
   - Nombre campaña, tono, tiempos, canal, CTA.

9. **Contenido sugerido por defecto**
   - Textos “seguros” listos para usar (placeholders inteligentes).

10. **Reglas de seguridad del template**
    - Dependencias críticas y validaciones automáticas.

11. **Resultado esperado + benchmark orientativo**
    - Ej.: “Tasa de respuesta esperada: 8–15%”.

12. **Mini guía de optimización**
    - “Si no funciona en 7 días, prueba estas 2 variaciones.”

---

## 3) Sistema de personalización guiada

Modelo recomendado: **Wizard de 4 pasos** con preview en vivo.

### Paso 1 — Objetivo
- Pregunta única: “¿Qué quieres lograr?”
- Opciones claras (captar leads, activar usuarios, etc.)
- Filtra automáticamente 3–5 templates recomendados.

### Paso 2 — Contexto
- Tipo de negocio, audiencia, volumen, canal principal.
- Lenguaje no técnico, con ejemplos.

### Paso 3 — Personalización mínima viable
- Solo campos esenciales para lanzar:
  - Nombre del flujo
  - Mensaje principal
  - Frecuencia/espera
  - CTA
- Avanzado queda colapsado por defecto.

### Paso 4 — Validación + lanzamiento
- Checklist final: “Todo listo para publicar”.
- Simulación de recorrido (qué verá el usuario final).
- Botón principal: “Activar flujo”.

### Principios UX del sistema guiado
- Una decisión por pantalla.
- Microcopy orientado a acción (“Siguiente: define tu mensaje”).
- Valores por defecto inteligentes (recomendados por industria).
- Guardado automático + progreso visible (1/4, 2/4…).

---

## 4) Cómo permitir modificación sin romper estructura base

Usar arquitectura de **capas bloqueadas + zonas flexibles**:

1. **Core inmutable (bloqueado)**
   - Nodos críticos de lógica (triggers, condiciones obligatorias, salida segura).
   - No editable para evitar romper funcionamiento.

2. **Capa configurable (editable guiada)**
   - Mensajes, demoras, canales, audiencias, etiquetas.
   - Edición con controles acotados (dropdown/range/toggle), no código libre.

3. **Módulos opcionales (“add-ons”)**
   - Bloques extra certificados: “recordatorio”, “escalamiento”, “A/B test”.
   - Se agregan con un clic sin alterar la base.

4. **Guardrails automáticos**
   - Validación previa a publicar (campos vacíos, loops, conflictos de timing).
   - Alertas claras: qué está mal y cómo corregirlo.

5. **Versionado y rollback**
   - Historial de cambios por versión.
   - “Volver a versión estable” en 1 clic.

6. **Modo sandbox / prueba segura**
   - Ejecutar con muestra pequeña antes de aplicar globalmente.

---

## 5) Métricas para evaluar qué templates funcionan mejor

Separar métricas en 4 niveles:

### A. Adopción
- **Template View → Use Rate:** % de vistas que terminan en “usar template”.
- **Activation Rate:** % de templates instalados que se publican.
- **Time to Launch:** tiempo medio hasta activación (meta < 5 min).

### B. Experiencia de configuración
- **Completion del wizard por paso** (dónde abandonan).
- **Tiempo por paso** (identificar fricción).
- **Errores de validación por template** (diseños confusos).

### C. Resultado de negocio del flujo
- KPI del flujo según categoría:
  - Conversión
  - Respuesta
  - Activación
  - Retención
  - CSAT/NPS
- **Lift vs. baseline** (antes/después de usar template).

### D. Salud del template a largo plazo
- **Edit Depth:** cuánto lo modifican tras instalar (siempre alto puede indicar mala base).
- **Rollback Rate:** frecuencia de deshacer cambios (señal de complejidad).
- **Reuse Rate:** cuántas veces se reutiliza en otras campañas/proyectos.
- **Template NPS interno:** “¿Este template te ayudó a lograr tu objetivo?”

### Framework de decisión (simple)
Un template es “ganador” si cumple durante 30 días:
- Activation Rate alto
- Time to Launch < 5 min
- Lift positivo en KPI primario
- Baja tasa de errores de configuración

---

## Recomendaciones de implementación para adopción rápida

1. **Empieza con 12–20 templates máximos** (no 100).
2. **Prioriza Quick Wins** en home de la librería.
3. **Cada template debe prometer un resultado concreto** (no una función técnica).
4. **Default-first:** que funcione sin tocar casi nada.
5. **Mejora continua con datos de uso reales**, no opiniones.

Con este enfoque, la Template Library deja de ser un catálogo y se convierte en un motor de activación rápida para usuarios no técnicos.
