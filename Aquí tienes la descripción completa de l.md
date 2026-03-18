Aquí tienes la descripción completa de la arquitectura de la plataforma low-code de flujos de trabajo (workflows) y formularios que estamos construyendo.

La arquitectura se basa en un patrón Metadata-Driven UI (Interfaz de Usuario impulsada por Metadatos). Esto significa que la aplicación no tiene las pantallas programadas de forma rígida (hardcoded), 
sino que un motor interpreta un archivo JSON para construir la interfaz y la lógica en tiempo real.

1. Componentes Principales del Sistema (Módulos)
La plataforma se divide en tres grandes piezas funcionales:
Dashboard (Panel de Control): Es el punto de entrada. Gestiona la lista de flujos de trabajo disponibles, permite agruparlos por categorías, crear nuevos o acceder a la ejecución de los existentes.
Workflow Builder (Constructor Visual): Es el entorno de diseño (Canvas).
Utiliza Drag and Drop (arrastrar y soltar) para posicionar elementos en una pantalla.
Permite crear múltiples "Pasos" (Steps/Screens) y conectarlos entre sí para definir el flujo de navegación.
Cuenta con un panel de propiedades para configurar cada campo (validaciones, textos, placeholders, identificadores).
Permite inyectar código personalizado (HTML, CSS, JS) por pantalla para comportamientos avanzados.
Workflow Renderer (Motor de Ejecución): Es el intérprete.
Toma el JSON generado por el Builder y lo transforma en una aplicación funcional.
Genera formularios reactivos dinámicamente basados en los campos definidos.
Maneja las validaciones, el estado del formulario y las transiciones entre pantallas (Next/Submit).
Incluye un simulador de dispositivos (Desktop, iPhone, Android) para previsualizar cómo se verá el flujo en diferentes resoluciones.

2. Stack Tecnológico (Frontend)
Framework: Angular (utilizando las últimas características como componentes Standalone y Control Flow @if, @for).
Gestión de Estado: Angular Signals (signal, computed). Se utiliza para un manejo del estado altamente reactivo y sin dependencias de zone.js (Zoneless), lo que mejora drásticamente el rendimiento.
Estilos y UI: Tailwind CSS para un diseño responsivo y utilitario.
Interacciones Complejas: Angular CDK (Component Dev Kit), específicamente el módulo de Drag & Drop para el lienzo de diseño del Builder.
Formularios: Reactive Forms de Angular para la validación y captura de datos en el motor de ejecución.

3. Modelo de Datos (El "Motor" JSON)
El núcleo de la arquitectura es el esquema de datos. Todo flujo se reduce a una estructura jerárquica:
Workflow (Flujo): Contiene metadatos globales (ID, nombre, descripción, categoría) y un arreglo de Steps.
Step (Pantalla/Paso): Representa una vista única. Contiene:
fields: Arreglo de componentes UI (textos, botones, dropdowns, firmas, SSO, etc.).
navigation: Reglas de hacia dónde ir después (ej. nextStep).
code: Bloques de código inyectado (htmlCode, cssCode, onInteractiveCode, etc.).
Field (Campo): El elemento atómico. Define su tipo (text, button, carousel, drawing), su posición absoluta en el canvas (x, y), sus dimensiones (width, height) y sus propiedades de negocio (requerido, valor por defecto, opciones de dropdown).

4. Flujo de Datos y Servicios
WorkflowService: Actúa como la capa de persistencia y estado global. Mantiene en memoria (y potencialmente en localStorage o una API Backend) la lista de flujos y expone métodos para guardar, actualizar y eliminar.
LanguageService: Un servicio reactivo basado en Signals que maneja la internacionalización (i18n). Permite cambiar toda la plataforma (Builder, Renderer y Dashboard) entre Inglés y Español en tiempo real de forma centralizada.

5. Características Clave de la Arquitectura
Aislamiento de Ejecución (Sandboxing): El WorkflowRenderer está diseñado para poder ejecutarse de forma independiente (ej. embebido en un iFrame o en una pestaña nueva mediante la ruta /run/:id), aislando la experiencia del usuario final de la experiencia del creador (Builder).
Branding Dinámico: Se ha estructurado el HTML para inyectar Mockups de la aplicación contenedora (como el Navbar con el logo de Broxel y el Footer con Términos y Condiciones) para dar contexto visual al creador de cómo se verá su flujo dentro del ecosistema real.
Extensibilidad: Al estar basado en un esquema JSON, agregar un nuevo tipo de componente (ej. un escáner de código de barras) solo requiere agregarlo al catálogo del Builder y crear su caso en el switch de renderizado del Renderer, sin alterar la arquitectura base.


Aquí tienes la Documentación Arquitectónica Completa de la Plataforma Low-Code que hemos construido. Esta documentación refleja todas las fases implementadas, las decisiones de diseño y los patrones utilizados.
📖 Documentación de Arquitectura: Plataforma Low-Code Enterprise
1. Visión General
La plataforma es un motor de flujos de trabajo (workflows) y formularios dinámicos basado en metadatos (JSON-driven). Permite a los usuarios definir interfaces, lógica condicional, integraciones y código personalizado en un formato JSON, que luego es interpretado y renderizado en tiempo real por el motor frontend.
Stack Tecnológico:
Framework: Angular (Zoneless, basado en Signals).
Lenguaje: TypeScript (Strict Mode).
Estilos: Tailwind CSS.
Arquitectura: Modular, orientada a eventos, JIT Compilation.
2. Fases y Módulos Core Implementados
Fase 1 & 2: Motor de Renderizado y Orquestador (FSM)
El núcleo de la plataforma es el WorkflowRendererComponent. Actúa como una Máquina de Estados Finitos (FSM) que gestiona la transición entre los diferentes "Pasos" (Steps) del flujo.
JSON-Driven UI: Convierte la definición JSON en controles de formulario reactivos (ReactiveFormsModule).
Gestión de Estado: Utiliza Angular Signals (workflow, currentStepIndex, formData) para mantener el estado global del flujo de forma síncrona y reactiva.
Device Preview: Capacidad de previsualizar el renderizado simulando diferentes dispositivos (iPhone, Pixel, Desktop) ajustando dinámicamente el viewport.
Fase 3: Arquitectura de Plugins (src/core/plugins/)
Para evitar que el motor principal crezca infinitamente con cada nuevo componente visual, se implementó un sistema de plugins.
PluginRegistryService: Un registro central donde los componentes externos (ej. SignaturePad, MapViewer) se registran mediante un identificador de tipo (string).
Lazy Loading: Permite cargar componentes dinámicamente usando *ngComponentOutlet solo cuando el JSON del flujo los requiere.
Fase 4: Motor de Integraciones (src/core/integrations/)
Permite que los flujos se comuniquen con APIs externas (REST, GraphQL) sin escribir código.
IntegrationService: Ejecuta llamadas HTTP basadas en configuraciones JSON.
Mapeo de Datos: Resuelve variables dinámicas (ej. {{form.userEmail}}) inyectándolas en las URLs, Headers o Body de la petición.
Manejo de Errores: Estructura para manejar timeouts, reintentos y mapeo de respuestas al estado del formulario.
Fase 5: Sandboxing y Código Personalizado (src/core/security/)
Permite a los creadores (Pro Developers) inyectar HTML, CSS y JavaScript personalizado de forma segura.
SandboxIframeComponent: Crea un <iframe> aislado (sandbox="allow-scripts") para ejecutar el código del usuario.
Aislamiento de Contexto: El código custom no tiene acceso al DOM principal ni a las cookies de la aplicación (prevención de XSS).
Comunicación Segura: Utiliza la API postMessage para sincronizar datos bidireccionalmente entre el iframe y el motor de Angular (VALUE_CHANGE, STATUS_CHANGE).
Fase 6: Control de Acceso (RBAC) (src/core/auth/)
Sistema de seguridad granular para entornos Multitenant.
AuthService: Gestiona la sesión del usuario y sus permisos usando Signals.
*appHasPermission (Directiva): Directiva estructural que evalúa si el usuario tiene un permiso específico (ej. custom_code:write). Si no lo tiene, el elemento no se renderiza en el DOM y se destruye, protegiendo componentes sensibles.
permissionGuard: Protege rutas a nivel del Router de Angular.
Fase 7: Optimización de Runtime (Performance) (src/core/rule-engine/)
Diseñado para soportar formularios masivos (300+ campos) sin bloquear el hilo principal.
Compilador JIT (RuleCompiler): Transforma el Árbol de Sintaxis Abstracta (AST) de las reglas JSON en funciones JavaScript nativas (new Function()). Esto acelera la evaluación de reglas entre 100x y 1000x en comparación con la interpretación recursiva.
Motor Reactivo (DAG) (ReactiveWorkflowEngine): Utiliza un patrón Proxy combinado con Angular Signals. Cuando una regla precompilada lee un campo, el motor registra automáticamente la dependencia. Si el campo "A" cambia, Angular solo reevalúa las reglas que dependen de "A", logrando una complejidad O(1) en las actualizaciones de UI.
Fase 8: Observabilidad y Telemetría (src/core/telemetry/)
Sistema de analítica para medir el rendimiento y el comportamiento del usuario.
TelemetryService: Recolecta eventos estructurados (WORKFLOW_STARTED, STEP_VIEWED, VALIDATION_FAILED).
Trazabilidad: Genera un traceId único por sesión para agrupar todos los eventos de un usuario llenando un formulario (Funnel Analysis).
Batching & Resiliencia: Acumula eventos en memoria y los envía en lotes cada 5 segundos. Utiliza navigator.sendBeacon para garantizar que los eventos de abandono se envíen incluso si el usuario cierra la pestaña.
SSR Ready: Compatible con Server-Side Rendering mediante la validación isPlatformBrowser(PLATFORM_ID).
3. Estructura de Directorios Clave
code
Text
src/
├── app/
│   └── renderer/
│       ├── workflow-renderer.component.ts    # Motor principal FSM y UI
│       └── workflow-renderer.component.html  # Plantilla con soporte para Plugins y Sandbox
├── core/
│   ├── auth/
│   │   ├── auth.service.ts                   # Estado RBAC (Signals)
│   │   ├── has-permission.directive.ts       # Directiva *appHasPermission
│   │   ├── models.ts                         # Tipos de Permisos y Usuario
│   │   └── permission.guard.ts               # Router Guard
│   ├── plugins/
│   │   └── registry.service.ts               # Registro de componentes dinámicos
│   ├── rule-engine/
│   │   ├── ast/types.ts                      # Definición del AST JSON
│   │   ├── compiler.ts                       # Compilador JIT (AST -> JS Nativo)
│   │   └── reactive-engine.service.ts        # Grafo de dependencias con Proxy/Signals
│   ├── security/
│   │   └── sandbox-iframe.component.ts       # Aislamiento de código custom (postMessage)
│   └── telemetry/
│       ├── models.ts                         # Esquema de eventos y métricas
│       └── telemetry.service.ts              # Recolección, Batching y sendBeacon
4. Flujo de Vida de un Workflow (Ejemplo Práctico)
Carga: El usuario entra a la URL /workflow/wf-1.
Inicialización: El WorkflowRenderer descarga el JSON. El TelemetryService genera un traceId y dispara WORKFLOW_STARTED.
Compilación: El ReactiveWorkflowEngine toma todas las reglas de visibilidad y validación del JSON y las pasa por el RuleCompiler, generando funciones JS en memoria.
Renderizado: Angular renderiza el Paso 1. Si hay campos nativos, usa ReactiveFormsModule. Si hay un campo signature, pide el componente al PluginRegistryService. Si hay código custom, verifica permisos con *appHasPermission y lo inyecta en el SandboxIframeComponent.
Interacción: El usuario teclea en un campo. El Proxy del motor reactivo detecta el cambio, actualiza el Signal correspondiente, y Angular actualiza únicamente los campos que dependían de ese valor en < 50ms.
Transición/Validación: El usuario hace clic en "Siguiente". Si falla, el TelemetryService registra VALIDATION_FAILED con los campos exactos. Si tiene éxito, avanza de paso y registra STEP_VIEWED.
Finalización: Al terminar, se dispara WORKFLOW_COMPLETED y los datos recolectados se envían al backend.
5. Próximos Pasos (Roadmap sugerido)
Para llevar esta plataforma a producción, las siguientes áreas del Backend deben alinearse con esta arquitectura frontend:
Builder UI (Editor Visual): Una interfaz Drag & Drop que genere el JSON AST que este motor consume.
Backend de Telemetría: Un endpoint /api/telemetry/batch optimizado para ingesta masiva (ej. usando Kafka o AWS Kinesis).
Backend de Integraciones: Un proxy seguro en el backend que ejecute las llamadas a APIs de terceros para no exponer API Keys en el frontend.





Para desplegar un nuevo flujo productivo en una plataforma Low-Code (donde el flujo es esencialmente un archivo JSON o DSL, no código fuente compilado), la estrategia cambia radicalmente respecto al desarrollo de software tradicional.
Aquí no haces un git push ni despliegas servidores; despliegas datos. Esto hace que el despliegue sea instantáneo, pero también requiere una gobernanza estricta para que un usuario de negocio no rompa la operación de la empresa con un clic.
Como Arquitecto de la plataforma, te recomiendo implementar el siguiente Modelo de Despliegue y Gobernanza (Release Management) integrado directamente en tu producto:
1. El Ciclo de Vida del Flujo (Estados)
Nunca se debe editar un flujo directamente en producción. El JSON del flujo debe pasar por un ciclo de vida estricto:
Draft (Borrador): El usuario está editando en el Rule Builder. Los cambios se guardan automáticamente, pero no afectan a nadie.
Testing / Staging: El creador genera un "Enlace de Prueba" (ej. midominio.com/test/wf-123). Este enlace usa la versión Draft para que el creador y su equipo prueben las validaciones, integraciones y reglas sin afectar la base de datos de producción.
Published (Producción): La versión oficial que ven los usuarios finales.
2. Estrategia de Versionado (Inmutabilidad)
La regla de oro del Low-Code: Los flujos en producción son inmutables.
Cuando un usuario decide publicar un Draft, el backend toma ese JSON y crea un nuevo registro en la base de datos (ej. Versión 1.0).
Si el usuario quiere añadir un campo nuevo mañana, edita el Draft. Al publicar, se crea la Versión 1.1.
¿Por qué? Si un usuario final está a la mitad de llenar la Versión 1.0 y tú despliegas la 1.1 (que elimina un campo), el formulario del usuario final fallaría al enviarse. La inmutabilidad garantiza que quien empezó en la v1.0, termina en la v1.0.
3. El Proceso de Despliegue (El "Go Live")
Para llevar un flujo a producción, te recomiendo este pipeline interno en tu plataforma:
A. Validación Estática (Pre-flight Check)
Antes de habilitar el botón "Publicar", tu backend debe correr un "Linter" sobre el JSON/AST:
¿Hay reglas que apuntan a campos que fueron eliminados?
¿Hay integraciones sin credenciales configuradas?
¿Hay bucles infinitos en el grafo reactivo?
Si hay errores, el despliegue se bloquea.
B. Gobernanza: Patrón "Maker-Checker" (Opcional por Workspace)
En entornos Enterprise, la persona que crea el flujo (Maker) no debe ser la misma que lo pasa a producción (Checker).
El usuario hace clic en "Solicitar Publicación".
Un administrador o gerente recibe una notificación, revisa el flujo en modo Testing, y hace clic en "Aprobar y Desplegar".
C. El "Switch" Atómico
El despliegue real en base de datos es un simple cambio de puntero.
Tienes una tabla Workflows y una tabla Workflow_Versions.
Desplegar es simplemente hacer: UPDATE Workflows SET active_version_id = 'v2' WHERE id = 'wf-123'.
Es instantáneo y con cero tiempo de inactividad (Zero Downtime).
4. Estrategias de Liberación (Release Strategies)
Para flujos críticos (ej. el Onboarding principal de clientes de un banco), ofrece opciones de despliegue avanzadas en tu UI:
Despliegue Directo (Big Bang): El 100% del tráfico nuevo va a la nueva versión. Ideal para flujos internos o correcciones de errores.
Phased Rollout (Canary Release): La UI permite al creador decir: "Desplegar esta nueva versión solo al 10% de los usuarios". Tu backend enruta aleatoriamente. Si la telemetría (Fase 7) no muestra un pico de VALIDATION_FAILED o WORKFLOW_ABANDONED, el creador sube el dial al 100%.
A/B Testing: Desplegar dos versiones simultáneas para ver cuál tiene mejor tasa de conversión.
5. El Botón de Pánico (Rollback Instantáneo)
Dado que guardamos cada versión como un JSON inmutable, el Rollback es trivial.
En el panel de administración del flujo, debe haber una pestaña de "Historial de Versiones".
Si la Versión 2.0 está fallando porque una API externa cambió, el administrador simplemente hace clic en "Revertir a v1.9".
El backend cambia el puntero active_version_id de vuelta a la v1.9 en milisegundos.
Resumen de Arquitectura de Base de Datos recomendada:
code
SQL
-- Tabla principal del flujo
Table Workflow {
  id UUID
  name String
  active_version_id UUID -- Apunta a la versión en producción
  draft_version_id UUID  -- Apunta al borrador actual
}

-- Tabla inmutable de versiones (El JSON)
Table WorkflowVersion {
  id UUID
  workflow_id UUID
  version_number Int
  definition_json JSONB -- Aquí vive el AST, UI, Integraciones
  created_by UUID
  created_at Timestamp
}
En conclusión: No trates los despliegues de tu plataforma como despliegues de software tradicional. Trátalos como un CMS (Content Management System) súper vitaminado. La clave del éxito empresarial de tu plataforma será darle al usuario la confianza de que es imposible romper producción de forma irreversible.





Nuestra arquitectura funciona exactamente igual. Tu aplicación Angular es el "Motor" (Engine) o "Reproductor".
¿Cómo funciona el despliegue en la realidad?
El Build Único (Tu lado): Tú compilas el proyecto Angular (ng build) y lo despliegas en tu servidor (AWS, Vercel, Firebase, etc.). 
Esa aplicación ya contiene el WorkflowRenderer, el motor de reglas JIT, y el sistema de plugins.
El Despliegue (El clic en "Publicar"): Cuando el usuario le da a "Publicar", el backend simplemente marca ese JSON como la versión "Activa". Tarda 50 milisegundos.
La Ejecución (Lado del Cliente Final):
Una persona entra a la URL pública: tuplataforma.com/f/solicitud-credito.
La aplicación Angular (que ya está cargada en su navegador) lee la URL, hace una petición HTTP a tu base de datos: "Oye, dame el JSON del flujo 'solicitud-credito'".
La base de datos devuelve el JSON.
El WorkflowRenderer lee el JSON y dibuja la pantalla en tiempo real (On-the-fly).
¿Por qué esta arquitectura (Metadata-Driven) es superior a generar código?
Si tu plataforma generara un nuevo proyecto Angular por cada flujo (Code Generation), tendrías problemas masivos:

Tiempos de espera: El usuario tendría que esperar 3 a 5 minutos (lo que tarda un pipeline de CI/CD en hacer npm install, ng build y subir a un servidor) cada vez que cambie el color de un botón. En nuestra arquitectura, el cambio es instantáneo.
Mantenimiento de pesadilla: Imagina que tienes 10,000 clientes y descubres un bug de seguridad en el componente del Calendario. Si generaste código, tendrías que re-compilar y re-desplegar 10,000 aplicaciones distintas. Con nuestra arquitectura, corriges el bug en tu proyecto Angular principal, haces un solo despliegue, y los 10,000 flujos se arreglan automáticamente al instante.
Costos de Infraestructura: Alojar 10,000 aplicaciones compiladas cuesta muchísimo dinero. Alojar 1 aplicación Angular y 10,000 registros de texto (JSON) en una base de datos cuesta centavos.
"¿Pero qué pasa con el código personalizado (Custom Code)?"
Incluso si un usuario "Pro" inyecta su propio HTML, CSS o JavaScript en el flujo, tampoco se recompila Angular. Ese código se guarda como texto plano dentro del JSON y, cuando el flujo se carga, nuestro SandboxIframeComponent inyecta ese texto en un iframe seguro en tiempo de ejecución.
En resumen: Tu plataforma es un lienzo dinámico. Desplegar un flujo es simplemente guardar datos en una base de datos, no compilar software.



La gran ventaja de haber elegido una arquitectura Metadata-Driven (basada en JSON) en lugar de generar código, es que escalar esto es un problema resuelto por la industria.
Para soportar picos masivos sin que la plataforma se caiga, la arquitectura del Backend debe dividirse en 5 capas estratégicas:
1. El Frontend (El Motor Angular) = Escalamiento Infinito
Tu aplicación Angular es un conjunto de archivos estáticos (HTML, CSS, JS).
Solución: No se aloja en servidores tradicionales (Node.js/Tomcat). Se sube a un CDN (Content Delivery Network) como AWS CloudFront, Cloudflare o Vercel.
Resultado: Cuando un millón de personas entran a la URL, están descargando los archivos desde el servidor de Cloudflare más cercano a su ciudad (Edge). Tu infraestructura interna ni se entera. El costo de cómputo es cero.
2. Lectura del Workflow (El JSON) = Caché en el Edge
Cuando el motor Angular carga, necesita pedir el JSON del flujo (GET /api/workflows/wf-123). Si un millón de personas hacen esa petición a tu base de datos (PostgreSQL/MongoDB), la base de datos explotará por falta de conexiones.
Solución: Como establecimos que las versiones en producción son inmutables, ese JSON nunca cambia. Por lo tanto, se cachea en el CDN (Edge Caching) o en un clúster de Redis en memoria.
Resultado: De 1 millón de peticiones, solo 1 llega a tu base de datos. Las otras 999,999 son respondidas por la memoria caché del CDN en milisegundos.
3. Ingesta de Datos (El "Submit") = Colas de Mensajes (Event-Driven)
Aquí está el verdadero cuello de botella. Un millón de personas haciendo clic en "Enviar" (POST /api/submissions) al mismo tiempo. Si intentas guardar cada registro directamente en la base de datos de forma síncrona, la base de datos se bloqueará (Deadlocks) y se caerá.
Solución: Arquitectura orientada a eventos. Pones un API Gateway súper rápido que recibe el JSON del usuario y lo avienta inmediatamente a una Cola de Mensajes (Apache Kafka, AWS SQS, o Google Pub/Sub).
Resultado: El API Gateway le responde al usuario en 10 milisegundos: "Recibido (HTTP 202 Accepted)". El usuario ve la pantalla de éxito y se va. Mientras tanto, en tu backend, tienes "Workers" (procesos en segundo plano) que van leyendo la cola a su propio ritmo (ej. 10,000 por segundo) y guardándolos en la base de datos de forma segura y ordenada. Nunca pierdes un solo dato, incluso si la base de datos se satura.
4. Ejecución de Integraciones = Serverless Workers
Si el flujo dice: "Al enviar, crear un ticket en Salesforce y enviar un email", no puedes hacer eso en el mismo hilo de ejecución, porque si Salesforce está lento, tu plataforma se vuelve lenta.
Solución: Los mismos "Workers" que leen la cola de mensajes (Paso 3) se encargan de disparar las integraciones de forma asíncrona. Si usas tecnologías Serverless (AWS Lambda o Cloudflare Workers), la nube de Amazon o Google instanciará automáticamente 10,000 micro-servidores por unos segundos para procesar esos envíos, y luego los destruirá.
5. Separación de Bases de Datos (CQRS)
No puedes usar la misma base de datos para los creadores (los miles de usuarios haciendo el workflow) y para los consumidores (los millones llenando datos).
DB de Metadatos (Relacional - PostgreSQL): Guarda los usuarios creadores, los workspaces, y las definiciones JSON de los flujos. Tiene poco tráfico pero requiere alta consistencia.
DB de Respuestas (NoSQL - DynamoDB / MongoDB / BigQuery): Guarda las respuestas de los usuarios finales. Está diseñada para absorber millones de escrituras por segundo sin inmutarse, ya que no tiene que verificar relaciones complejas (Foreign Keys).
Resumen del Flujo en un Pico Masivo (Ej. Super Bowl Promo):
1,000,000 de usuarios entran a la URL.
Cloudflare (CDN) les entrega la app Angular y el JSON del flujo en 50ms. (Carga en tus servidores: 0%).
Los usuarios llenan el formulario. El motor reactivo evalúa el AST localmente en sus navegadores. (Carga en tus servidores: 0%).
1,000,000 de usuarios hacen clic en "Enviar" al mismo tiempo.
AWS API Gateway recibe los datos y los mete a AWS SQS (Cola). Responde "Éxito" a los usuarios. (Tus servidores no se caen, la cola absorbe el impacto como un amortiguador).
Tus Workers (Lambdas) leen la cola, guardan en DynamoDB y envían los correos a su propio ritmo durante los siguientes 2 minutos.
Conclusión: Al separar el estado (JSON) de la ejecución (Angular), y al desacoplar la recepción de datos (Cola) del almacenamiento (DB), tu plataforma se vuelve virtualmente inmune a las caídas por picos de tráfico. Es la misma arquitectura que usan gigantes como Typeform, Qualtrics o Shopify.


PHASE 1: Foundation & Database (Week 1)
Objectives
 PostgreSQL setup and migration
 TypeORM entities fully aligned with schema
 Multi-tenancy enforcement layer
 Authentication/Authorization foundation
Tasks
Database Setup (3-4 hours)

Create PostgreSQL database
Execute migration: 0001_initial_schema.sql
Verify all 15 tables and indexes created
Test multi-tenancy row filtering
Entity Alignment (4-5 hours)

Verify all entities sync with schema (15 tables)
Add missing decorators (@OneToMany, @ManyToOne, onDelete strategies)
Fix nullable/required fields
Add CHECK constraints via TypeORM decorators
Test entity creation and relations
Auth Layer (3-4 hours)

Create JWT strategy (@nestjs/passport)
Implement TenantInterceptor (extracts org_id from JWT)
Create AuthGuard for protected routes
Multi-tenant access validation

PHASE 2: Core Backend APIs (Week 1-2)
Objectives
 CRUD APIs for applications, workflows, forms
 Application versioning (draft/publish/rollback)
 Workflow instance lifecycle management
Tasks
Application Management (4-5 hours)

ApplicationsController with: GET, POST, PATCH endpoints
ApplicationsService with version management
Immutability: prevent definition_json mutation post-publish
Test authorization (org_id filtering)
Workflow Definition APIs (4-5 hours)

WorkflowsController CRUD
WorkflowNodesController for node management
WorkflowTransitionsController for transitions
Canvas position tracking (position_x, position_y)
Form & Screen APIs (3-4 hours)

FormsController with schema validation
ScreensController with layout management
ComponentsController (XOR constraint: screen OR form)
Versioning Service (2-3 hours)

AppVersioningService
Draft → Published → Archived lifecycle
Rollback capability
definition_json immutability enforcement
definition_hash SHA-256 deduplication


PHASE 3: Rule Engine & Submission Processing (Week 2)
Objectives
 Rule evaluation against workflow context
 Submission pipeline (pending → processing → completed/rejected)
 Job queue for async processing
Tasks
Rule Engine Implementation (5-6 hours)

RulesEngineService evaluates condition_json
Recursive condition parsing (AND/OR operators)
Action execution (routing, variable assignment, rejection)
Rule priority ordering
Event publishing (RuleEvaluatedEvent)
Submission Processing (4-5 hours)

SubmissionsService with status pipeline
Data validation against form schema
Queue integration for async processing
SubmissionsWorkerService processes queue jobs
WorkflowInstanceService state transitions
Workflow Instance State Machine (3-4 hours)

pending → running → completed | failed | paused
Invalid transition rejection
WorkflowExecutionLog audit trail (append-only)
Context tracking (context_json updates)
PHASE 4: Telemetry & Observability (Week 2)
Objectives
 Event publishing for all domain changes
 Telemetry event storage
 Event-driven architecture foundation
Tasks
Event Bus Setup (2-3 hours)

DomainEventsService (NestJS @EventEmitter)
Core event types (WorkflowStartedEvent, SubmissionProcessedEvent, etc.)
Event handlers/subscribers
Telemetry Storage (2 hours)

TelemetryService saves events to DB
event_category enum enforcement (workflow, submission, rule, user_action, system, error)
Retention policy setup
PHASE 5: Frontend Core (Week 1-2)
Objectives
 Dashboard with workflow list
 Workflow builder (canvas)
 Form submission renderer
 Real-time state updates
Tasks
Setup & Models (2-3 hours)

Frontend models aligned with backend schema
HTTP interceptors for org_id headers
Error handling service
Type-safe API client
Dashboard Component (3-4 hours)

List applications
List workflow instances (status, created date)
Basic filtering and pagination
Navigation to builder/renderer
Workflow Builder (6-8 hours)

Canvas rendering (workflow nodes with position_x/y)
Node creation/deletion/selection
Transition drawing (edges)
Save as draft
Publish version
Form Renderer Component (4-5 hours)

Dynamic form generation from schema_json
Input validation
Submit to backend (creates Submission)
Status display (pending, processing, completed, rejected)
Workflow Renderer (3-4 hours)

Display current node in running instance
Show node details
Display submission history
Status timeline
PHASE 6: Integration & Testing (Week 3)
Objectives
 E2E workflow from definition to execution
 Multi-tenancy test suite
 Error handling & edge cases
 Performance optimization
Tasks
Backend Integration Tests (4-5 hours)

Test DB → Service → Controller flow
Multi-tenant data isolation tests
State machine transitions
Rule evaluation scenarios
Frontend Integration & E2E (3-4 hours)

Workflow creation → publishing flow
Instance startup → form submission → completion
Error scenarios
Concurrent submissions
Performance & Optimization (2-3 hours)

Query optimization (N+1 detection)
Index verification
Pagination on large datasets
Frontend CD detection strategy
PHASE 7: Deployment & Polish (Week 3)
Objectives
 Staging environment ready
 Comprehensive documentation
 Security hardening
Tasks
Backend Hardening (3-4 hours)

Input validation & sanitization
Rate limiting on critical endpoints
Logging/monitoring setup
Error handling middleware
Frontend Polish (2-3 hours)

Loading states & spinners
Error toast notifications
User feedback messages
Accessibility (a11y) basics
Deployment (2-3 hours)

Docker setup (backend + frontend)
CI/CD pipeline (GitHub Actions)
Environment config management
Database migration automation
Critical Path Items (Must-Have for MVP)
Database
 Schema defined
 Migration executed
 Entities created & tested
 Indexes verified
Backend
 Auth/TenantInterceptor
 Applications API (CRUD + versioning)
 Workflows API (CRUD)
 Forms API (CRUD)
 RulesEngineService
 SubmissionsService + Worker
 WorkflowInstanceService (state machine)
 WorkflowExecutionLog (audit trail)
Frontend
 Models & HTTP client
 Dashboard (list apps/instances)
 Workflow Builder (canvas, node management)
 Form Renderer (submission flow)
 Authentication (login flow)
Infrastructure
 PostgreSQL running
 NestJS app running
 Angular app running
 Basic error handling
Success Metrics (MVP Complete When)
User can create workflow (backend API + frontend UI)
User can publish workflow (versioning works)
Workflow can execute (instance creation, state transitions)
User can submit form (submission → processing → completion)
Rules can route submissions (conditional logic works)
Audit trail exists (execution logs recorded)
Multi-tenancy enforced (org_id filtering verified)
No data leaks between orgs (test suite validates)
Timeline Estimate
Phase 1-2: 10-12 hours (3-4 working days)
Phase 3-4: 14-16 hours (3-4 working days)
Phase 5: 19-23 hours (4-5 working days)
Phase 6-7: 14-16 hours (3-4 working days)
Total MVP: 57-67 hours (~2 weeks full-time)
Risks & Mitigations
Risk	Impact	Mitigation
Entity relations cascading incorrectly	Data loss	Test all cascade strategies; start with RESTRICT
Immutability not enforced (definition_json mutations)	Runtime inconsistency	Add service-layer guard; test prevents mutations
Multi-tenancy leak (cross-org access)	CRITICAL SECURITY	Test suite for every query; code review all service methods
Rule engine evaluation bugs	Workflow routing fails	Unit test all condition operators; integration test complex conditions
Job queue failures	Submissions stuck	Retry logic; dead-letter queue; monitoring
Frontend form validation mismatch	UX friction	Share schema contract between backend and frontend
Next Steps (Start Immediately)
Execute Phase 1, Task 1: Set up PostgreSQL and run migration
Create session notes tracking Phase progress
Begin Phase 1, Task 2: Entity alignment (start with Organization, User)
In parallel: Code review current entity definitions for gaps</parameter> </invoke> </function_calls>
Now let me create a detailed technical checklist:
<function_calls>
<parameter name="tool_name">create_file</parameter>
<parameter name="path">/memories/session/TECHNICAL_GAPS_IDENTIFIED.md</parameter>
<parameter name="fileContent"># Technical Gaps & Improvements Needed

Backend Issues
🔴 CRITICAL - Security & Multi-Tenancy
 TenantInterceptor not visible in codebase - MUST CREATE
 AuthGuard implementation status unclear
 Every service method must verify organization_id ownership
 No visible middleware for JWT validation
 organization_id parameter missing from many service methods
🔴 CRITICAL - Database
 Migration file needs verification (check if all 15 tables created)
 Entity cascade strategies need review (review @JoinColumn onDelete settings)
 Need to verify all entities have organization_id + multi-tenant filtering
 TypeORM lazy loading needs configuration review
🟡 HIGH PRIORITY - Core Services
 ApplicationVersioningService exists but needs full implementation

 Draft creation
 Publish validation (immutability checks)
 Archive capability
 Rollback logic
 definition_hash computation
 RulesEngineService partially implemented

 Recursive condition evaluation (AND/OR)
 Action execution handlers
 Priority ordering
 Event publishing
 WorkflowInstanceService state machine

 State transition validation
 Invalid transition rejection
 Execution log creation
 SubmissionsService pipeline

 Status lifecycle enforcement
 Form data validation
 Queue publisher integration
 Async worker integration
🟡 HIGH PRIORITY - Events & Async
 DomainEventsService needs event types and subscribers
 Job queue setup (@nestjs/bull) not visible
 SubmissionsWorkerService needs full implementation
 Event subscribers for telemetry
🟡 HIGH PRIORITY - Controllers
 Applications controller needs all CRUD endpoints
 Workflows controller needs node/transition management
 Forms controller validation
 WorkflowInstances controller (start, pause, cancel, get status)
 Submissions controller (create, get, list)
🟠 MEDIUM PRIORITY - DTOs
 Missing DTOs for all endpoints
 create-workflow.dto.ts
 update-workflow.dto.ts
 create-form.dto.ts
 start-workflow-instance.dto.ts
 etc.
🟠 MEDIUM PRIORITY - Validation
 Input validation not visible (need @IsNotEmpty, @IsUUID decorators)
 Form schema validation against submission data
 Rule condition validation
🟠 MEDIUM PRIORITY - Error Handling
 Custom exception classes needed
 InvalidWorkflowStateException
 RuleEvaluationException
 SubmissionValidationException
 etc.
 Global exception filter missing
Frontend Issues
🔴 CRITICAL - Setup
 HTTP interceptor for org_id headers not shown
 API base URL configuration
 Authentication integration unclear
 JWT token storage/refresh not visible
🟡 HIGH PRIORITY - Models & Types
 Model files exist but need verification against backend schema
 Need discriminated unions for workflow node types
 Status types need alignment with backend enums
🟡 HIGH PRIORITY - Core Features
 Dashboard component: needs application/instance listing
 Workflow Builder: needs canvas + node management
 Form Renderer: needs dynamic form generation
 Workflow Renderer: needs instance status display
🟡 HIGH PRIORITY - Services
 WorkflowService: incomplete implementation
 NLWorkflowService: AI-assisted workflow (nice-to-have for MVP)
 Need services for applications, instances, submissions, rules
🟠 MEDIUM PRIORITY - State Management
 No global state (user, current workflow, etc.)
 Need BehaviorSubjects for reactive updates
 No shared services between components
🟠 MEDIUM PRIORITY - Observability
 No error handling service
 No logging service
 No user feedback (toasts/notifications)
Infrastructure Issues
🔴 CRITICAL - Deployment
 Docker setup not visible
 Environment configuration (.env) not shown
 Database connection string management
🟠 MEDIUM PRIORITY - CI/CD
 GitHub Actions or similar not configured
 Build/test automation missing
 Pre-commit hooks not set up
🟠 MEDIUM PRIORITY - Development
 Hot reload configuration
 Mock backend interceptor exists but may need enhancement
 Test DB setup not visible
Database Alignment Checklist
Required Entities (15 total)
 Organization
 User
 Application
 ApplicationVersion
 Workflow (verify all fields)
 WorkflowNode (verify all fields)
 WorkflowTransition (verify all fields)
 Form (verify schema_json)
 Screen (verify layout_json)
 Component (verify XOR constraint)
 Rule (verify condition_json, action_json)
 WorkflowInstance (verify context_json, status)
 WorkflowExecutionLog (append-only, never update/delete)
 Submission (verify data_json, status)
 TelemetryEvent (verify event_category enum)
Required Indexes (42 total)
 38 B-tree indexes verified
 4 GIN indexes on JSONB verified
 Performance query tests passed
Code Quality Gaps
TypeScript Strict Mode
 Verify "strict": true in tsconfig.json
 No implicit any types
 All function signatures typed
 Null/undefined handling explicit
Testing
 No test files visible (.spec.ts)
 Test database setup needed
 Unit tests for services required
 Integration tests for multi-tenancy
 State machine tests required
Documentation
 API endpoint documentation needed
 Service architecture diagrams
 Database schema queries documented
 Deployment instructions needed
Implementation Priority
Must-Have Before MVP (Week 1)
Database migration & entity validation
TenantInterceptor & AuthGuard
Applications CRUD + versioning
Workflows CRUD + nodes/transitions
Forms CRUD with schema validation
Frontend models & HTTP client
Must-Have Before MVP (Week 2)
RulesEngineService (full implementation)
WorkflowInstanceService (state machine)
SubmissionsService (pipeline + worker)
Event publishing infrastructure
Dashboard component
Workflow builder component
Form renderer component
Nice-to-Have (Post-MVP)
Natural language workflow building
Advanced rule UI (visual rule builder)
Webhooks & integrations
API documentation (OpenAPI)
Performance metrics dashboard
Advanced reporting
</parameter> </invoke> </function_calls>

Now let me create a week-by-week detailed breakdown:
<function_calls>
<parameter name="tool_name">create_file</parameter>
<parameter name="path">/memories/session/WEEKLY_BREAKDOWN.md</parameter>
<parameter name="fileContent"># Weekly Breakdown - MVP Execution

WEEK 1: Foundation (Mon-Fri)
Day 1 (Mon): Database & Entities Setup
Time Allocation: 8 hours

Morning (4 hours):

PostgreSQL Setup (1 hour)

 Install PostgreSQL 14+
 Create database: lowcode_mvp
 Create roles/users
 Verify connection from NestJS
Migration Execution (1.5 hours)

 Execute 0001_initial_schema.sql
 Verify all 15 tables created
 Verify all indexes created (42 total)
 Check for migration errors
Review & Fix Entity Definitions (1.5 hours)

 Organization.entity.ts
 User.entity.ts
 Application.entity.ts
 ApplicationVersion.entity.ts
Afternoon (4 hours):
4. Entity Relations & Cascade (2 hours)

 Workflow relations
 WorkflowNode relations
 WorkflowTransition relations
 Test cascade deletion
Remaining Entities (2 hours)
 Form, Screen, Component
 Rule
 WorkflowInstance, WorkflowExecutionLog
 Submission, TelemetryEvent
 Verify all have organization_id + created_at/updated_at
Deliverable: Fully functional database with all 15 entities created and relations verified.

Day 2 (Tue): Authentication & Multi-Tenancy Layer
Time Allocation: 8 hours

Morning (4 hours):

JWT Strategy Setup (1.5 hours)

 Install @nestjs/jwt, @nestjs/passport, passport-jwt
 Create JwtStrategy in auth module
 Implement JWT signing in login flow
 Test token creation
TenantInterceptor Creation (2.5 hours)

 Create tenant.interceptor.ts
 Extract organization_id from JWT
 Add to request object
 Test multi-tenant request handling
Afternoon (4 hours):
3. AuthGuard & Permission Check (2 hours)

 Create auth.guard.ts
 Implement token validation
 Test protected routes
Mock Authentication (2 hours)
 Create mock user/org for testing
 Seed database with test data
 Verify tenant filtering in queries
Deliverable: Secure multi-tenant request handling with org_id enforcement.

Day 3 (Wed): Applications API
Time Allocation: 8 hours

Morning (4 hours):

ApplicationsService Methods (2 hours)

 findByOrg(orgId) - list all apps
 findById(orgId, appId) - get single app
 create(orgId, dto) - create new app
 Add organization_id to all queries
DTO Creation (1 hour)

 create-application.dto.ts
 update-application.dto.ts
 Add validation decorators
ApplicationsController (1 hour)

 GET /applications
 GET /applications/:id
 POST /applications
 PATCH /applications/:id
 DELETE /applications/:id
Afternoon (4 hours):
4. Application Versioning Service (2 hours)

 createDraft(appId) - create draft version
 publish(orgId, versionId) - publish version
 rollback(orgId, appId) - revert to previous published
 definition_hash computation (SHA-256)
VersioningController & Testing (2 hours)
 Version CRUD endpoints
 Test draft → published → archived flow
 Test immutability enforcement
 Test rollback capability
Deliverable: Complete application management with versioning system.

Day 4 (Thu): Workflows & Forms API
Time Allocation: 8 hours

Morning (4 hours):

WorkflowDefinitionService (2 hours)

 createWorkflow(appId, dto)
 updateWorkflow(orgId, workflowId, dto)
 getWorkflows(appId) with relations
 deleteWorkflow(orgId, workflowId)
WorkflowNodesService (2 hours)

 createNode(workflowId, dto) - position_x/y tracking
 updateNode(orgId, nodeId, dto) - position updates
 deleteNode(orgId, nodeId)
 getNodesByWorkflow(workflowId) with transitions
Afternoon (4 hours):
3. WorkflowTransitionsService (1.5 hours)

 createTransition(workflowId, sourceNodeId, targetNodeId, dto)
 updateTransition(orgId, transitionId, dto)
 Validate no self-loops
 Support condition_json
FormsService & Controller (2.5 hours)
 createForm(appId, dto) - schema_json validation
 updateForm(orgId, formId, dto)
 getForm(orgId, formId)
 Form field metadata
Deliverable: Complete workflow and form definition APIs with canvas support.

Day 5 (Fri): Backend API Testing & Frontend Setup
Time Allocation: 8 hours

Morning (4 hours):

Integration Tests (2 hours)

 Test app creation → versioning → publish flow
 Test workflow creation with nodes/transitions
 Test multi-tenant isolation
 Test invalid state transitions
Error Handling & Validation (2 hours)

 Global exception filter
 Custom exception classes
 Input validation (class-validator decorators)
 Consistent error responses
Afternoon (4 hours):
3. Frontend Setup (2 hours)

 Create models aligned with backend schema
 Set up HTTP client with interceptor for org_id
 Authentication service (mock for now)
 AppState/Store for global state
Frontend Services Base (2 hours)
 WorkflowService (API methods mapped to backend)
 ApplicationService
 SubmissionService API stubs
 Type safety verification
Deliverable: Functioning backend APIs + frontend foundation ready for component development.

WEEK 2: Core Features (Mon-Fri)
Day 6 (Mon): Rule Engine Implementation
Time Allocation: 8 hours

Morning (4 hours):

RulesEngineService Core (3 hours)

 evaluateCondition(condition, context) - recursive ANDor
 compareValues(actual, operator, expected) - all operators
 executeAction(action, context) - routing, variables, rejection
 Error handling for malformed conditions
Testing & Validation (1 hour)

 Unit tests for all condition operators
 Test complex nested conditions
 Test action execution
Afternoon (4 hours):
3. Event Publishing (2 hours)

 Create RuleEvaluatedEvent
 Publish event on rule match
 Create event subscribers
RulesService API Layer (2 hours)
 createRule(appId, dto)
 updateRule(orgId, ruleId, dto)
 getRules(appId) - ordered by priority
 Rule testing endpoint
Deliverable: Fully functional rule engine with event publishing.

Day 7 (Tue): Workflow Instance & State Machine
Time Allocation: 8 hours

Morning (4 hours):

WorkflowInstanceService (2.5 hours)

 startInstance(orgId, workflowId) - create with pending status
 transitionInstance(orgId, instanceId, targetStatus) - validate transitions
 getInstanceStatus(orgId, instanceId) - with context_json
 State transition validation logic
ExecutionLogService (1.5 hours)

 createLog(instanceId, event) - append-only
 getInstanceLogs(orgId, instanceId) - history
 Immutability enforcement
Afternoon (4 hours):
3. WorkflowInstancesController (2 hours)

 POST /workflow-instances (start)
 GET /workflow-instances (list with status filter)
 GET /workflow-instances/:id (get single)
 PATCH /workflow-instances/:id (transition status)
Testing State Machine (2 hours)
 Test all valid transitions
 Test invalid transition rejection
 Test execution log creation
 Test context_json updates
Deliverable: Robust state machine with audit trail.

Day 8 (Wed): Submission Processing Pipeline
Time Allocation: 8 hours

Morning (4 hours):

SubmissionsService (2 hours)

 submitForm(orgId, instanceId, formId, data) - create with pending
 getSubmission(orgId, submissionId)
 getInstanceSubmissions(orgId, instanceId) - list
 Validate form data against schema
Queue Integration (2 hours)

 Set up @nestjs/bull job queue (Redis)
 QueuePublisherService: enqueue submission for processing
 Test queue connectivity
Afternoon (4 hours):
3. SubmissionsWorkerService (2 hours)

 @Process('process') handler
 Call RulesEngine with submission data
 Update instance context & status
 Determine next node from rules
 Handle errors (dead-letter queue)
SubmissionsController (2 hours)
 POST /submissions (create + enqueue)
 GET /submissions/:id
 GET /submissions (list with pagination)
 Monitor queue status endpoint
Deliverable: End-to-end submission processing with asynchronous rule evaluation.

Day 9 (Thu): Events & Telemetry
Time Allocation: 8 hours

Morning (4 hours):

Event Bus Setup (2 hours)

 DomainEventsService with @EventEmitter
 Event types: WorkflowStarted, SubmissionProcessed, RuleEvaluated, etc.
 Event subscribers registration
TelemetryService (2 hours)

 recordEvent(category, event) - saves to telemetry_events
 Event category enum validation
 Metadata JSON support
 Query telemetry (analytics prep)
Afternoon (4 hours):
3. Event Subscribers (2 hours)

 WorkflowStartedEvent → create execution log
 RuleEvaluatedEvent → telemetry + logging
 SubmissionProcessedEvent → telemetry
 Error events → error logging
TelemetryController & Testing (2 hours)
 GET /telemetry (filtered by organization)
 Test event recording
 Test event filtering
Deliverable: Event-driven architecture with full observability.

Day 10 (Fri): Frontend - Dashboard & Core Components
Time Allocation: 8 hours

Morning (4 hours):

Dashboard Component (2.5 hours)

 Application list with search/filter
 Workflow instance list (status, dates)
 Create new app button
 Navigation to builder/renderer
Application Detail View (1.5 hours)

 Display app metadata
 List published versions
 Version publish button
 Workflow list within app
Afternoon (4 hours):
3. Workflow Builder Component Start (2 hours)

 Canvas rendering (using d3.js or fabric.js)
 Display existing nodes with positions
 Display transitions as edges
 Basic styling
Form Renderer Component Start (2 hours)
 Dynamic form generation from schema_json
 Input field types (text, number, dropdown, checkbox, etc.)
 Basic validation messages
 Submit button (tied to submission API)
Deliverable: Functional frontend UI for viewing and starting workflows.

WEEK 3: Integration & Optimization (Mon-Wed)
Day 11 (Mon): Workflow Builder Completion
Time Allocation: 8 hours

Morning (4 hours):

Node Management (2 hours)

 Create node modal
 Update node properties (label, type, configJson)
 Delete node
 Drag to reposition (position_x/y updates)
Transition Management (2 hours)

 Draw transition between nodes (click + drag)
 Update transition properties (label, condition)
 Delete transition
 Validate no self-loops
Afternoon (4 hours):
3. Save & Publish Workflow (2 hours)

 Save as draft (PATCH /workflows)
 Publish version button
 Confirmation modal
 Version history sidebar
Testing & Polish (2 hours)
 Undo/redo functionality (nice-to-have)
 Canvas pan/zoom
 Error messages for invalid states
 Auto-save every 30 seconds
Deliverable: Complete workflow builder with canvas interactions.

Day 12 (Tue): Form Renderer & Instance Execution
Time Allocation: 8 hours

Morning (4 hours):

Advanced Form Rendering (2 hours)

 Conditional fields (based on context_json)
 Field validation rules (min/max, regex, required)
 Dynamic value population from context
 Field help text & tooltips
Submission Integration (2 hours)

 Submit form → POST /submissions
 Show processing status
 Handle validation errors from backend
 Redirect on completion/rejection
Afternoon (4 hours):
3. Workflow Instance Renderer (2 hours)

 Display current node in running instance
 Show node details (label, type)
 Render form for current node
 Show submission history
Status Display & Navigation (2 hours)
 Instance status badge (running, paused, completed, failed)
 Timeline of state changes
 Back to instance list
 Pause/resume/cancel instance
Deliverable: Complete form submission flow with status tracking.

Day 13 (Wed): Integration Tests & Deployment Prep
Time Allocation: 8 hours

Morning (4 hours):

E2E Workflow Test (2 hours)

 Create app → version → publish
 Create workflow → add nodes → add transitions
 Start instance
 Submit form → rule evaluation → state change
 Verify execution logs recorded
 Verify telemetry events
Multi-Tenancy Tests (2 hours)

 Verify org_id filtering on all endpoints
 Verify user from Org A cannot access Org B data
 Verify cross-org instance queries fail
 Verify cross-org submission access denied
Afternoon (4 hours):
3. Docker & Environment Setup (2 hours)

 Dockerfile for backend (Node 18+)
 Dockerfile for frontend (Node 18, build+serve)
 docker-compose.yml (backend, frontend, postgres, redis)
 .env.example with required variables
Deployment Checklist (2 hours)
 Environment variables documented
 Database migrations automated
 Health check endpoints
 Logging configured
 Error monitoring ready
Deliverable: Docker-ready application with E2E tested functionality.

Success Criteria by End of Week 3
Backend ✅
 PostgreSQL with all 15 tables
 Multi-tenant security enforced
 All CRUD APIs functional
 Rule engine evaluates conditions
 Workflow instances execute with state machine
 Submissions process asynchronously
 Events published and recorded
 Audit logs preserved
 Error handling robust
 Tests verify multi-tenancy
Frontend ✅
 Authentication stub (can mock users)
 Dashboard shows apps & instances
 Workflow builder (canvas + nodes)
 Form renderer (submission flow)
 Status displays (instance lifecycle)
 Error messages user-friendly
 Responsive design (basic)
Infrastructure ✅
 Docker setup
 Environment configuration
 Database migrations automated
 Logging configured
 Error monitoring ready
Testing ✅
 E2E workflow: definition → execution → completion
 Multi-tenancy: data isolation tested
 State machine: transitions validated
 Rule engine: condition evaluation tested
 Submissions: async processing verified
Post-MVP Roadmap (Future Sprints)
Sprint 4: Advanced Features
Natural language workflow builder (AI-assisted)
Visual rule builder (UI improvements)
Webhooks & external integrations
Advanced form validation & conditions
Bulk submission processing
Performance metrics dashboard
Sprint 5: Enterprise
Database partitioning (high volume)
Full-text search on submission data
Advanced reporting & analytics
Audit compliance & data retention
Role-based permissions (fine-grained)
Single Sign-On (SSO)
Sprint 6: Optimization & Scale
Connection pooling tuning
Query optimization
Caching layer (Redis)
Rate limiting & quotas
Monitoring & alerting setup
Load testing & benchmarking
</parameter> </invoke> </function_calls>

Perfect! Now let me create one final document with code structure recommendations:

Now let me create code templates and structure recommendations:
<function_calls>
<parameter name="tool_name">create_file</parameter>
<parameter name="path">/memories/session/CODE_STRUCTURE_RECOMMENDATIONS.md</parameter>
<parameter name="fileContent"># Code Structure & Implementation Guidelines

Backend Directory Structure (Post-MVP)
backend/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── constants/
│   │   ├── cache.constants.ts
│   │   └── enums.constants.ts
│   ├── decorators/
│   │   ├── organization-id.decorator.ts (extracts from request)
│   │   └── permission.decorator.ts
│   ├── exceptions/
│   │   ├── base.exception.ts
│   │   ├── not-found.exception.ts
│   │   ├── invalid-state.exception.ts
│   │   └── unauthorized.exception.ts
│   ├── filters/
│   │   └── http-exception.filter.ts (global error handler)
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── permission.guard.ts
│   ├── interceptors/
│   │   ├── tenant.interceptor.ts (CRITICAL)
│   │   ├── logging.interceptor.ts
│   │   └── response.interceptor.ts
│   └── pipes/
│       └── validation.pipe.ts
├── infrastructure/
│   ├── database/
│   │   ├── DATABASE_SCHEMA_GUIDE.md
│   │   ├── typeorm.config.ts
│   │   ├── migrations/
│   │   │   └── 0001_initial_schema.sql
│   │   └── seeds/ (optional)
│   │       └── seed.ts
│   ├── queue/
│   │   ├── queue.module.ts
│   │   └── queue-publisher.service.ts
│   └── external/
│       ├── email.service.ts (stubs)
│       └── webhook.service.ts (future)
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   │       └── login.dto.ts
│   ├── organizations/
│   │   ├── organizations.module.ts
│   │   ├── entities/
│   │   │   └── organization.entity.ts
│   │   └── services/
│   │       └── organizations.service.ts
│   ├── users/ (IAM module)
│   │   ├── users.module.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── services/
│   │   │   └── users.service.ts
│   │   └── controllers/
│   │       └── users.controller.ts
│   ├── applications/
│   │   ├── applications.module.ts
│   │   ├── entities/
│   │   │   ├── application.entity.ts
│   │   │   └── application-version.entity.ts
│   │   ├── services/
│   │   │   ├── applications.service.ts
│   │   │   ├── app-versioning.service.ts
│   │   │   └── app-validation.service.ts
│   │   ├── controllers/
│   │   │   └── applications.controller.ts
│   │   └── dto/
│   │       ├── create-application.dto.ts
│   │       ├── update-application.dto.ts
│   │       └── create-version.dto.ts
│   ├── workflows/
│   │   ├── workflows.module.ts
│   │   ├── entities/
│   │   │   ├── workflow.entity.ts
│   │   │   ├── workflow-node.entity.ts
│   │   │   └── workflow-transition.entity.ts
│   │   ├── services/
│   │   │   ├── workflow-definition.service.ts
│   │   │   ├── workflow-node.service.ts
│   │   │   └── workflow-transition.service.ts
│   │   ├── controllers/
│   │   │   └── workflows.controller.ts
│   │   └── dto/
│   │       ├── create-workflow.dto.ts
│   │       ├── create-node.dto.ts
│   │       └── create-transition.dto.ts
│   ├── definitions/
│   │   ├── definitions.module.ts
│   │   ├── entities/
│   │   │   ├── form.entity.ts
│   │   │   ├── screen.entity.ts
│   │   │   └── component.entity.ts
│   │   ├── services/
│   │   │   ├── forms.service.ts
│   │   │   ├── screens.service.ts
│   │   │   └── components.service.ts
│   │   ├── controllers/
│   │   │   ├── forms.controller.ts
│   │   │   └── screens.controller.ts
│   │   └── dto/
│   │       ├── create-form.dto.ts
│   │       └── create-screen.dto.ts
│   ├── rules/
│   │   ├── rules.module.ts
│   │   ├── entities/
│   │   │   └── rule.entity.ts
│   │   ├── services/
│   │   │   ├── rules.service.ts
│   │   │   ├── rules-engine.service.ts (complex logic)
│   │   │   └── rule-evaluator.service.ts (unit logic)
│   │   ├── controllers/
│   │   │   └── rules.controller.ts
│   │   └── dto/
│   │       ├── create-rule.dto.ts
│   │       └── evaluate-rule.dto.ts
│   ├── runtime/
│   │   ├── runtime.module.ts
│   │   ├── entities/
│   │   │   ├── workflow-instance.entity.ts
│   │   │   └── workflow-execution-log.entity.ts
│   │   ├── services/
│   │   │   ├── workflow-instance.service.ts
│   │   │   └── execution-log.service.ts
│   │   ├── controllers/
│   │   │   └── workflow-instances.controller.ts
│   │   └── dto/
│   │       └── start-workflow-instance.dto.ts
│   ├── submissions/
│   │   ├── submissions.module.ts
│   │   ├── entities/
│   │   │   └── submission.entity.ts
│   │   ├── services/
│   │   │   ├── submissions.service.ts
│   │   │   ├── queue-publisher.service.ts
│   │   │   └── response-store.service.ts (state management)
│   │   ├── controllers/
│   │   │   └── submissions.controller.ts
│   │   └── dto/
│   │       ├── create-submission.dto.ts
│   │       └── submission-query.dto.ts
│   ├── events/
│   │   ├── events.module.ts
│   │   ├── services/
│   │   │   ├── domain-events.service.ts (event bus)
│   │   │   └── event-subscribers.service.ts
│   │   └── types/
│   │       ├── workflow-started.event.ts
│   │       ├── submission-processed.event.ts
│   │       ├── rule-evaluated.event.ts
│   │       └── ...
│   ├── telemetry/
│   │   ├── telemetry.module.ts
│   │   ├── entities/
│   │   │   └── telemetry-event.entity.ts
│   │   ├── services/
│   │   │   └── telemetry.service.ts
│   │   ├── controllers/
│   │   │   └── telemetry.controller.ts
│   │   └── subscribers/
│   │       ├── workflow.telemetry.ts
│   │       ├── submission.telemetry.ts
│   │       └── rule.telemetry.ts
│   └── workers/
│       ├── workers.module.ts
│       └── services/
│           ├── submissions-worker.service.ts
│           └── queue-consumer.ts
└── shared/
    ├── types.ts (shared interfaces)
    └── utils.ts

Frontend Directory Structure

broxel/src/app/
├── app.ts (root component)
├── app.routes.ts
├── app.config.ts
├── models/
│   ├── workflow.model.ts
│   ├── application.model.ts
│   ├── submission.model.ts
│   ├── rule.model.ts
│   ├── user.model.ts
│   └── index.ts (barrel export)
├── core/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── permission.guard.ts
│   │   ├── has-permission.directive.ts
│   │   └── models.ts
│   ├── http/
│   │   ├── http.interceptor.ts (org_id headers)
│   │   ├── error.interceptor.ts
│   │   └── auth.interceptor.ts
│   ├── state/
│   │   ├── user.state.service.ts (BehaviorSubject)
│   │   ├── current-workflow.state.ts
│   │   └── current-instance.state.ts
│   ├── services/
│   │   ├── error-handler.service.ts
│   │   ├── notification.service.ts
│   │   └── logger.service.ts
│   └── explainability/
│       └── explainability.service.ts
├── shared/
│   ├── components/
│   │   ├── header/
│   │   ├── sidebar/
│   │   ├── error-message/
│   │   ├── loading-spinner/
│   │   └── toast-notification/
│   ├── pipes/
│   │   └── capitalize.pipe.ts
│   ├── directives/
│   │   └── has-permission.directive.ts
│   └── styles/
│       └── variables.css
├── features/
│   ├── dashboard/
│   │   ├── dashboard.routes.ts
│   │   ├── pages/
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.component.html
│   │   │   └── dashboard.component.css
│   │   ├── components/
│   │   │   ├── app-list/
│   │   │   ├── instance-list/
│   │   │   └── quick-stats/
│   │   └── services/
│   │       └── dashboard.service.ts
│   ├── builder/
│   │   ├── builder.routes.ts
│   │   ├── pages/
│   │   │   ├── workflow-builder.component.ts
│   │   │   ├── workflow-builder.component.html
│   │   │   └── workflow-builder.component.css
│   │   ├── components/
│   │   │   ├── canvas/
│   │   │   │   ├── workflow-canvas.component.ts
│   │   │   │   └── workflow-canvas.component.css
│   │   │   ├── node-editor/
│   │   │   │   └── node-editor.component.ts
│   │   │   ├── transition-editor/
│   │   │   │   └── transition-editor.component.ts
│   │   │   ├── properties-panel/
│   │   │   │   └── properties-panel.component.ts
│   │   │   └── node-library/
│   │   │       └── node-library.component.ts
│   │   └── services/
│   │       ├── builder.service.ts
│   │       └── canvas.service.ts
│   ├── renderer/
│   │   ├── renderer.routes.ts
│   │   ├── pages/
│   │   │   ├── workflow-renderer.component.ts
│   │   │   ├── workflow-renderer.component.html
│   │   │   └── workflow-renderer.component.css
│   │   ├── components/
│   │   │   ├── form-render/
│   │   │   ├── node-display/
│   │   │   ├── status-timeline/
│   │   │   └── submission-list/
│   │   └── services/
│   │       └── renderer.service.ts
│   ├── wizard/
│   │   ├── wizard.routes.ts
│   │   ├── pages/
│   │   │   └── workflow-wizard.component.ts
│   │   └── services/
│   │       └── wizard.service.ts
│   ├── rules/
│   │   ├── rules.routes.ts
│   │   ├── pages/
│   │   │   └── rule-builder.component.ts
│   │   ├── components/
│   │   │   ├── condition-builder/
│   │   │   └── action-builder/
│   │   └── services/
│   │       └── rules.service.ts
│   └── business-insights/
│       └── (telemetry dashboard)
├── services/
│   ├── api/
│   │   ├── applications.api.ts
│   │   ├── workflows.api.ts
│   │   ├── forms.api.ts
│   │   ├── submissions.api.ts
│   │   ├── rules.api.ts
│   │   ├── instances.api.ts
│   │   └── telemetry.api.ts
│   ├── workflow.service.ts
│   ├── application.service.ts
│   ├── submission.service.ts
│   └── nl-workflow.service.ts (NLP)
