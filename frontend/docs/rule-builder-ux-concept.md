# Diseño conceptual: Rule Builder visual tipo IFTTT para plataforma enterprise

## 1) Estructura visual del Rule Builder

### 1.1 Layout general (3 paneles)

1. **Panel izquierdo: Catálogo de bloques (What can I use?)**
   - **Datos/Variables** (campo cliente, estado de pedido, monto, fecha, canal, etc.).
   - **Operadores humanos** (es igual a, contiene, es mayor que, está entre, existe, no existe).
   - **Acciones** (mostrar campo, ocultar campo, marcar requerido, validar formato, asignar valor, disparar alerta).
   - **Plantillas de reglas** (ej: “Si país = X, entonces mostrar documento Y”).
   - Búsqueda semántica (“buscar por intención”) y filtros por dominio.

2. **Panel central: Canvas de reglas (How it behaves)**
   - Unidad principal: **Tarjeta de Regla** con formato:
     - `SI` [condiciones]
     - `ENTONCES` [acciones]
     - `SI NO` (opcional)
   - Soporte drag-and-drop + edición guiada en formularios.
   - Orden visual por prioridad o por alcance (global, sección, campo).

3. **Panel derecho: Inspector contextual (Details & quality)**
   - Metadatos: nombre de regla, descripción en lenguaje natural, etiquetas.
   - Alcance: dónde aplica (pantalla, formulario, campo).
   - Estado de calidad: “válida”, “ambigua”, “contradictoria”, “incompleta”.
   - Traza de evaluación simplificada (“esta regla se dispara cuando…”).

### 1.2 Jerarquía de navegación

- **Nivel 1: Policies / Módulos** (ej: onboarding, scoring, compliance).
- **Nivel 2: Rule Sets** (conjuntos por proceso).
- **Nivel 3: Reglas individuales**.
- **Nivel 4: Condiciones y acciones internas**.

Esto reduce carga cognitiva: el usuario empieza con macro-contexto y baja al detalle solo cuando lo necesita.

### 1.3 Microinteracciones clave

- Autocompletado de valores válidos por tipo de dato.
- Chips legibles para cada condición (“Edad > 18”).
- Preview en lenguaje natural en tiempo real.
- “Test rápido” con datos de ejemplo en panel lateral.
- Undo/redo y versionado por regla.

---

## 2) Representación de condiciones anidadas

### 2.1 Modelo visual recomendado: grupos tipo “bloque lógico”

Usar una metáfora de bloques anidados con borde y sangría:

- **Grupo** = contenedor lógico con operador principal (`TODAS` = AND, `CUALQUIERA` = OR).
- Cada grupo contiene:
  - condiciones simples, y/o
  - subgrupos.

Ejemplo visual (texto):

- SI **TODAS**
  - `País = MX`
  - **CUALQUIERA**
    - `Edad >= 18`
    - `TutorLegal = true`
  - `Canal != Partner`

### 2.2 Reglas de diseño para anidación

- Máximo recomendado de profundidad visible: **3 niveles** (más allá, colapsar).
- Colores semánticos suaves por nivel para orientación espacial.
- Etiquetas persistentes del operador del grupo (no ocultar “TODAS/CUALQUIERA”).
- Botón “Convertir a subgrupo” para refactor visual sin romper lógica.

### 2.3 Controles para AND/OR sin fricción

- Segment control en cada grupo: `TODAS (AND)` / `CUALQUIERA (OR)`.
- Cambio de operador con simulación instantánea de impacto:
  - “Antes: 45% de casos activaban la regla. Ahora: 78%”.
- Confirmación solo cuando el cambio afecta reglas dependientes.

---

## 3) Prevención de reglas contradictorias

### 3.1 Guardrails en tiempo de edición

1. **Validación sintáctica**
   - Campos obligatorios completos (atributo, operador, valor).
   - Compatibilidad tipo-operador (no permitir “contiene” en numéricos).

2. **Validación semántica**
   - Rango inválido (`monto > 100` y `monto < 50` en el mismo AND).
   - Condiciones mutuamente excluyentes.
   - Acciones opuestas sobre mismo target (mostrar y ocultar el mismo campo, simultáneamente).

3. **Validación de cobertura**
   - Detectar huecos (“ninguna regla cubre estado pendiente”).
   - Detectar solapamientos no deseados entre reglas.

### 3.2 Sistema de severidad

- **Error (bloqueante)**: contradicción lógica dura.
- **Advertencia**: posible ambigüedad o solapamiento.
- **Sugerencia**: oportunidad de simplificación.

Cada issue debe incluir:
- explicación en lenguaje natural,
- por qué importa,
- acción recomendada (“fusionar”, “separar por prioridad”, “añadir excepción”).

### 3.3 Simulador de escenarios

- “Probar regla” con combinaciones de entradas.
- Mostrar qué condiciones se cumplieron/no cumplieron.
- Dif visual entre dos versiones de la regla (antes/después).

---

## 4) Traducción interna a AST sin exponerlo

### 4.1 Patrón de arquitectura UX → Dominio

Introducir un **ViewModel intermedio**:

- **Capa UI (human-readable):** bloques, grupos, operadores legibles.
- **Capa ViewModel canónica:** estructura normalizada e inmutable para edición segura.
- **Capa Engine (AST):** nodos técnicos para compilador JIT y grafo reactivo.

El usuario solo interactúa con la capa UI; la conversión a AST ocurre en segundo plano.

### 4.2 Estrategia de mapeo

1. Cada condición visual genera un nodo atómico canónico (`campo`, `operador`, `valor`, `tipo`).
2. Cada grupo visual genera nodo lógico (`all`/`any`).
3. Acciones generan nodos de efecto con metadatos de prioridad y scope.
4. El sistema produce:
   - AST ejecutable,
   - fingerprint de regla para versionado,
   - grafo de dependencias para reactividad.

### 4.3 Transparencia controlada (sin exponer AST)

- Mostrar “explicación ejecutable” en NL:
  - “Esta regla se evalúa de izquierda a derecha y requiere que todas las condiciones del grupo principal sean verdaderas”.
- Trazabilidad por IDs funcionales no técnicos (ej: `Regla-Cliente-Edad-01`).
- Auditoría exportable para compliance.

---

## 5) Riesgos de usabilidad y mitigaciones

### Riesgo 1: Sobrecarga cognitiva en reglas complejas

- **Mitigación:** progressive disclosure, colapsado por niveles, plantillas por caso de uso, modo básico/avanzado.

### Riesgo 2: Confusión AND vs OR

- **Mitigación:** copy semántico (`TODAS` / `CUALQUIERA`), ejemplos inline, simulación de impacto antes de confirmar.

### Riesgo 3: Dificultad para depurar “por qué no se disparó”

- **Mitigación:** trazas visuales por condición (verde/rojo), panel “reasoning path”, historial de evaluación.

### Riesgo 4: Reglas duplicadas o inconsistentes entre equipos

- **Mitigación:** detección de similitud, recomendaciones de reutilización, ownership por regla, workflow de aprobación.

### Riesgo 5: Pérdida de confianza por automatizaciones inesperadas

- **Mitigación:** sandbox de pruebas, modo borrador, despliegue gradual (canary), registro de cambios claro.

### Riesgo 6: Dependencia de lenguaje técnico

- **Mitigación:** glosario contextual, labels de negocio, evitar términos como AST/JIT en UI final.

---

## Blueprint operativo recomendado

1. Diseñar biblioteca de bloques orientada a negocio (no a ingeniería).
2. Implementar editor por grupos lógicos anidados con límites de complejidad.
3. Añadir motor de validación en vivo (sintaxis + semántica + cobertura).
4. Conectar un traductor ViewModel → AST desacoplado de la UI.
5. Integrar simulador + trazabilidad para explicación y auditoría.

Con este enfoque, el usuario construye reglas avanzadas con mental model visual y lenguaje de negocio, mientras la plataforma conserva potencia técnica (AST/JIT/reactividad) de forma invisible.
