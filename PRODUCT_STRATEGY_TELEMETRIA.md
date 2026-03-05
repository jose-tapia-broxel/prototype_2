# Framework de métricas de negocio sobre telemetría técnica

## Objetivo
Traducir eventos técnicos de telemetría en **decisiones de negocio**, priorizando adopción, conversión, retención y expansión de valor.

---

## 1) KPIs principales (nivel dirección + operación)

> Regla: cada KPI debe conectar con una decisión concreta y un owner.

### A. Valor entregado
- **Activation Rate (Aha! en primeros X días)**
  - % de cuentas nuevas que alcanzan el primer resultado de valor.
  - Decisión: mejorar onboarding y time-to-value.
- **Time to First Value (TTFV)**
  - Tiempo medio desde alta hasta primer hito de valor.
  - Decisión: reducir fricción inicial.
- **Feature Adoption by Segment**
  - % de adopción de capacidades clave por segmento (SMB, Mid, Enterprise).
  - Decisión: roadmap y enablement comercial por segmento.

### B. Conversión y crecimiento
- **North Star Conversion**
  - % de usuarios/cuentas que completan el flujo core que genera valor económico.
- **Trial-to-Paid / Freemium-to-Paid**
  - Conversión a pago por cohorte y segmento.
- **Expansion Signals**
  - % de cuentas que incrementan uso en features premium o multiproducto.

### C. Retención y salud
- **Week 1 / Week 4 Retention**
  - Retención temprana para detectar fallas de onboarding.
- **Logo Churn Risk Index**
  - Índice compuesto con caída de uso, errores críticos y baja recurrencia.
- **Stickiness (DAU/WAU o WAU/MAU según producto)**
  - Frecuencia de uso útil, no solo visitas.

### D. Eficiencia operativa ligada a negocio
- **Successful Journey Rate**
  - % de journeys críticos completados sin fricción severa.
- **Error Impacted Revenue Sessions**
  - Sesiones con intención de compra/upgrade afectadas por error.
- **SLA de Experiencia**
  - % de sesiones dentro de umbrales de experiencia aceptables (latencia, disponibilidad) para journeys de alto valor.

---

## 2) Funnel visual ideal (de negocio, no técnico)

## Vista recomendada: “Dual Funnel”

### Funnel A: Adquisición → Valor
1. **Cuentas creadas**
2. **Onboarding iniciado**
3. **Onboarding completado**
4. **Primer valor alcanzado**
5. **Uso recurrente en 7 días**

### Funnel B: Valor → Monetización
1. **Usuarios activos con valor**
2. **Uso de feature monetizable**
3. **Intento de compra/upgrade**
4. **Pago exitoso**
5. **Renovación/expansión**

## Capas visuales clave
- **Conversión por paso** (global y por segmento).
- **Tiempo entre pasos** (mediana y p90).
- **Drop-off reasons** (top 3 causas por paso).
- **Impacto económico estimado** por fuga.

## Diseño de dashboard
- Fila 1: KPIs ejecutivos (North Star, TTFV, Retención, Conversión a pago).
- Fila 2: Funnel A y Funnel B comparables por cohorte.
- Fila 3: Heatmap de fricción por etapa y segmento.
- Fila 4: Lista priorizada de oportunidades (impacto × esfuerzo).

---

## 3) Cómo detectar fricción automáticamente

## Enfoque: sistema de señales + scoring

### Señales de fricción (inputs)
- Reintentos repetidos en una acción clave.
- Tiempo excesivo en un paso vs benchmark por segmento.
- Backtracking (ir y volver entre pasos).
- Caída abrupta de conversión en cohortes recientes.
- Combinación de error técnico + abandono inmediato.
- Necesidad de soporte justo después del evento crítico.

### Friction Score por etapa
Definir un score 0–100 por journey:
- 35% caída de conversión del paso.
- 25% incremento de tiempo p90.
- 20% tasa de errores con impacto en intención.
- 20% señales de frustración comportamental (reintentos, abandono rápido).

### Alertas automáticas
- Alertas por desvío estadístico (no por umbral fijo únicamente).
- Detección de anomalías por segmento/canal/dispositivo.
- Priorización por **impacto esperado en revenue o retención**.

---

## 4) Cómo generar recomendaciones accionables

## Marco: Insight → Causa probable → Acción → Impacto esperado

### Plantilla de recomendación
1. **Insight**: “En Enterprise, el paso de configuración avanzada cayó -18% WoW.”
2. **Causa probable**: mayor complejidad + latencia en validaciones.
3. **Acción propuesta**:
   - Simplificar el flujo (menos campos obligatorios).
   - Introducir guardado parcial.
   - Mejorar feedback de progreso y errores.
4. **Experimento**:
   - A/B test con criterio de éxito definido.
5. **Impacto esperado**:
   - +6–10% en completion del paso.
   - +2–3 pp en conversión a pago en ese segmento.

### Priorización de acciones
- Usar **RICE** (Reach, Impact, Confidence, Effort) o ICE.
- Separar quick wins (2–4 semanas) de apuestas estructurales (trimestre).
- Asignar owner por equipo: Producto, UX, Ingeniería, Revenue Ops.

### Cierre de loop
- Toda recomendación debe tener:
  - Métrica leading (ej. completion del paso).
  - Métrica lagging (ej. conversión o retención).
  - Fecha de revisión y criterio de rollback.

---

## 5) Cómo evitar sobrecarga de datos

## Principio: “Menos métricas, más decisiones”

### Arquitectura de consumo
- **Nivel Ejecutivo (5–7 KPIs)**: visión semanal/mensual.
- **Nivel Squad (10–15 métricas operativas)**: optimización diaria/semanal.
- **Nivel Diagnóstico**: acceso self-service a detalle solo cuando hay alerta.

### Reglas anti-ruido
- 1 KPI = 1 owner + 1 decisión explícita.
- Eliminar métricas sin uso en 30–60 días.
- Evitar métricas espejo (mismo fenómeno con distinto nombre).
- Mostrar tendencia y benchmark, no solo valor absoluto.
- Limitar dashboards: “overview + detalle bajo demanda”.

### Narrativa ejecutiva estándar
Cada reporte semanal debe responder solo:
1. ¿Qué cambió?
2. ¿Por qué cambió?
3. ¿Qué haremos esta semana?
4. ¿Qué impacto esperamos?

---

## Implementación sugerida (90 días)

### Fase 1 (Semanas 1–3): Diseño de métricas
- Definir North Star y 6–8 KPIs de negocio.
- Mapear 2 funnels críticos.
- Alinear definiciones entre Producto, Data y Negocio.

### Fase 2 (Semanas 4–7): Detección de fricción
- Construir Friction Score por etapa.
- Activar alertas por anomalía y segmentación.
- Baseline de TTFV, conversión y retención.

### Fase 3 (Semanas 8–12): Recomendaciones y ejecución
- Generar backlog priorizado por impacto.
- Correr experimentos A/B.
- Institucionalizar business review semanal con formato único.

## Resultado esperado
Pasar de “muchos eventos técnicos” a un sistema que:
- Explica claramente dónde se pierde valor.
- Prioriza acciones con impacto económico.
- Reduce tiempo de decisión entre insight y ejecución.
