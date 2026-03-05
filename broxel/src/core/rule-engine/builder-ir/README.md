# Capa intermedia del Rule Builder (Visual -> IR -> AST)

Este módulo introduce un **modelo JSON intermedio (IR)** entre el editor visual y el AST ejecutable.

## 1) Modelo JSON intermedio

Se usa `RuleDocument` como contrato estable y versionado:

- `version`: versión semántica del contrato IR.
- `ruleId`: id lógico de la regla.
- `rootNodeId`: raíz del grafo de nodos.
- `nodes`: diccionario `id -> RuleNode` para escalabilidad (mejor que estructuras anidadas profundas).
- `diagnostics`: errores/advertencias persistibles de edición.
- `metadata`: origen, timestamp y extensiones.

Tipos de nodo:

- `group`: representa combinadores lógicos (`AND`/`OR`) con lista de hijos.
- `predicate`: comparación campo-operador-valor.
- `function`: llamada a funciones registradas (extensión futura).

## 2) Validación previa a compilar

`RuleDocumentValidator` ejecuta validaciones por capas:

1. **Estructural**: nodo raíz válido, nodos existentes, ciclos, conectividad.
2. **Límites operativos**: `maxNodes` y `maxDepth` para evitar reglas explosivas.
3. **Semántica de dominio**: campos existentes, funciones registradas, referencias válidas.

La salida es un arreglo de `RuleDiagnostic` con `code`, `severity`, `nodeId`, `path` y `suggestion`.

## 3) Manejo de errores de sintaxis visual

El editor visual consume diagnósticos y los pinta por nodo/campo:

- `severity=error`: bloquea compilación JIT.
- `severity=warning`: permite compilar con telemetría.

Para UX robusta:

- mantener nodos inválidos en IR (no descartarlos),
- asociar `path` para foco directo del control visual,
- registrar `suggestion` para autofix guiado.

## 4) Sincronización bidireccional (visual <-> AST)

`RuleIRMapper` define dos transformaciones:

- `fromAst(ast) -> RuleDocument`: permite cargar reglas existentes en el builder.
- `toAst(ruleDocument) -> ASTNode`: compila únicamente desde IR validado.

Estrategia recomendada de sincronización:

1. Visual actualiza IR incrementalmente.
2. Validador corre en cada cambio (debounce corto).
3. Si no hay errores, generar AST y cachear hash de compilación.
4. Si llega AST externo, convertir a IR y hacer merge por `node.id` para preservar estado UI (`ui`, `annotations`).

## 5) Extensibilidad futura

Diseño preparado para crecimiento:

- Versionado por `RuleDocument.version` + migradores (`v1 -> v2`).
- Nodo `function` para reglas avanzadas sin romper `predicate`.
- `metadata.extensions` y `annotations` para features de producto.
- Validadores enchufables por dominio (`payments`, `fraud`, `crm`).
- Diccionario de nodos para soportar reglas grandes, edición colaborativa y diffs parciales.

## Flujo recomendado de compilación

1. Builder visual -> genera/actualiza `RuleDocument`.
2. `RuleDocumentValidator.validate(...)`.
3. Si `error` vacío -> `RuleIRMapper.toAst(...)`.
4. AST -> compilador JIT actual.

Este enfoque desacopla UX visual de ejecución, reduce deuda técnica y permite evolución del lenguaje sin reescribir la UI.
