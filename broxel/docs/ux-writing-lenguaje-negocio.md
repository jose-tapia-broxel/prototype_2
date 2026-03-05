# Guía de UX Writing: de lenguaje técnico a lenguaje de negocio

## 1) Tabla de equivalencias técnicas → humanas

| Término técnico | Alternativa orientada a negocio (UI) | Cuándo usarla | Tooltip/microcopy sugerido |
|---|---|---|---|
| Workflow | **Proceso** / **Flujo de trabajo** | Para hablar del recorrido completo de una operación de negocio. | "Define el proceso de principio a fin para esta operación." |
| Instance | **Caso** / **Ejecución** | Cuando se refiere a una corrida específica de un proceso. | "Cada caso representa una ejecución real del proceso." |
| Step | **Etapa** / **Acción** | Para cada bloque dentro del proceso. | "Configura qué ocurre en esta etapa." |
| Rule | **Condición** / **Criterio** | Al expresar lógica de decisión. | "Si se cumple este criterio, aplica esta acción." |
| AST | **Estructura de reglas** (interno) | Evitar mostrar "AST" en UI. Reservarlo para documentación técnica interna. | "Motor interno que interpreta las condiciones configuradas." |
| Integration | **Conexión** / **Sistema conectado** | Al enlazar herramientas externas (CRM, ERP, pagos, etc.). | "Conecta este proceso con tus sistemas actuales." |

### Reglas rápidas de uso
- Priorizar **"Proceso"** frente a "Workflow" en menús y títulos.
- Usar **"Caso"** para negocio y **"Ejecución"** para vistas operativas/monitorización.
- Reemplazar "Rule" por **"Condición"** cuando el usuario toma decisiones de negocio.
- Mantener "AST" oculto en frontend; solo visible en logs o documentación técnica.

---

## 2) Principios para nombrar funciones

1. **Empezar por el objetivo de negocio, no por la implementación**  
   - Mejor: "Aprobar solicitud"  
   - Evitar: "Evaluar regla de estado"

2. **Usar verbo + resultado esperado**  
   - "Enviar factura" / "Asignar responsable" / "Validar datos del cliente"

3. **Mantener una sola intención por nombre**  
   - Si una función hace dos cosas, separarla o renombrar por su resultado principal.

4. **Hablar en el idioma del usuario final**  
   - Si ventas dice "oportunidad" y no "lead", respetar ese término en producto.

5. **Elegir nivel de detalle según contexto**  
   - En listados: breve ("Enviar recordatorio").  
   - En configuración: más explícito ("Enviar recordatorio por email al cliente").

6. **Evitar siglas internas salvo que sean universales para el negocio**  
   - Evitar "AST", "DTO", "Webhook" sin aclaración contextual.

---

## 3) Cómo evitar ambigüedades

### A. Definir un "término canónico" por concepto
- Un único término oficial por concepto en toda la plataforma.  
- Ejemplo: decidir entre "Caso" o "Ejecución" y documentar cuándo aplica cada uno.

### B. Prohibir sinónimos en elementos críticos
- En navegación, botones y estados, no alternar entre "Proceso", "Flujo", "Workflow" sin regla.

### C. Añadir contexto en etiquetas cortas
- "Condición" puede ser ambiguo: usar apoyo contextual.  
  - "Condición de aprobación"  
  - "Condición de envío"

### D. Diseñar microcopys desambiguadores
- Bajo campos clave, incluir una frase de ayuda con estructura:  
  **Qué es + Para qué sirve + Ejemplo**.

### E. Revisar términos "falsos amigos"
- "Instancia" puede sonar técnico; preferir "Caso" para usuarios no técnicos.

---

## 4) Estrategia de consistencia lingüística

## A. Crear un glosario vivo de producto
- Columnas mínimas: término técnico, término UI, definición, contexto permitido, término prohibido, responsable.
- Ubicarlo en una fuente central (Notion/Confluence/Repo).

## B. Definir una guía de estilo textual
- Tono: claro, directo, accionable.
- Persona gramatical: infinitivo en acciones ("Guardar cambios").
- Capitalización: consistente (sentence case recomendado).

## C. Implementar gobernanza de lenguaje
- Nombrar un **owner de UX writing** (o comité liviano).
- Toda nueva feature debe pasar checklist de lenguaje antes de release.

## D. Integrar el lenguaje en el flujo de desarrollo
- En diseño: revisión de labels y estados.
- En QA: pruebas de consistencia terminológica.
- En analytics: detectar términos que generan fricción (abandono, errores, soporte).

## E. Versionar decisiones
- Registrar cambios terminológicos con fecha, razón y áreas impactadas.
- Evitar cambios silenciosos que rompan entrenamiento de usuarios.

---

## 5) Cómo validar comprensión con usuarios reales

## Método recomendado (rápido y accionable)

1. **Test de comprensión de etiquetas (5 segundos)**
   - Mostrar pantalla/label y preguntar: "¿Qué crees que hace esto?"
   - Métrica: % de interpretación correcta.

2. **Pruebas de primer clic**
   - Tarea: "Configura una condición para aprobar pedidos > 10.000".
   - Métrica: primer clic correcto y tiempo al clic.

3. **Entrevistas moderadas con protocolo fijo**
   - Preguntas clave:  
     - "¿Qué entiendes por Caso?"  
     - "¿Qué diferencia ves entre Proceso y Etapa?"  
     - "¿Qué palabra te resulta más clara: Condición o Regla?"

4. **A/B test de terminología en producción**
   - Variante A: "Regla" vs Variante B: "Condición".
   - Métricas: finalización de tarea, tasa de error, tickets de soporte.

5. **Métricas de soporte y éxito**
   - Categorizar tickets por confusión terminológica.
   - Monitorear reducción de dudas tras cambios de copy.

## Criterios de aceptación sugeridos
- ≥ 85% de usuarios interpreta correctamente términos clave en tests de comprensión.
- ≥ 90% de primer clic correcto en tareas principales.
- Reducción de al menos 20% en tickets por "no entiendo este término" en 1-2 ciclos.

---

## Checklist operativo para tu equipo

- [ ] Existe glosario canónico publicado y actualizado.
- [ ] Términos técnicos sensibles (ej. AST) no aparecen en UI general.
- [ ] Botones y menús usan verbos de negocio claros.
- [ ] Se ejecuta test de comprensión antes de cada release relevante.
- [ ] Se miden impactos en conversión, error y soporte.
