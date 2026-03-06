import { TemplateDefinition } from './template-library.models';

export const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  {
    id: 'lead-reactivation',
    name: 'Recuperar leads inactivos en 7 días',
    category: 'Captación y conversión',
    outcome: 'Reactivar conversaciones con contactos fríos en menos de una semana.',
    problem: 'Tus leads dejan de responder y el pipeline se congela.',
    useWhen: 'Tienes leads sin respuesta por 10+ días.',
    avoidWhen: 'No tienes aún un mensaje de valor claro o un CTA concreto.',
    setupMinutes: 4,
    difficulty: 'Básico',
    requirements: ['Lista de leads con email', 'Mensaje principal de reactivación'],
    variables: [
      { id: 'flowName', label: 'Nombre del flujo', type: 'text', required: true, defaultValue: 'Reactivación de leads' },
      { id: 'audience', label: 'Audiencia objetivo', type: 'text', required: true, defaultValue: 'Leads sin respuesta' },
      { id: 'mainMessage', label: 'Mensaje principal', type: 'textarea', required: true, defaultValue: '¿Sigues evaluando una solución para este problema?' },
      { id: 'waitHours', label: 'Horas de espera antes del recordatorio', type: 'number', required: true, defaultValue: 48 },
      { id: 'cta', label: 'CTA', type: 'text', required: true, defaultValue: 'Reserva una demo de 15 minutos' }
    ],
    addOns: ['Recordatorio extra', 'A/B test de asunto'],
    benchmark: 'Tasa de respuesta esperada: 8–15%',
    optimizationTip: 'Si la respuesta es baja, reduce el mensaje a una sola pregunta y cambia el CTA.',
    kpis: ['Use Rate', 'Activation Rate', 'Tasa de respuesta'],
    createWorkflow: (config) => ({
      name: String(config['flowName']),
      description: `Template: Reactivación de leads para ${config['audience']}`,
      category: 'Captación y conversión',
      steps: [
        {
          id: 'step_1',
          title: 'Mensaje de reactivación',
          fields: [
            { id: 'leadEmail', type: 'email', label: 'Email del lead', required: true },
            { id: 'message', type: 'longText', label: `Mensaje: ${config['mainMessage']}`, required: true }
          ],
          navigation: { nextStep: 'step_2' }
        },
        {
          id: 'step_2',
          title: 'Seguimiento',
          fields: [
            { id: 'wait', type: 'number', label: `Esperar ${config['waitHours']} horas`, required: true, defaultValue: Number(config['waitHours']) },
            { id: 'cta', type: 'shortText', label: `CTA: ${config['cta']}`, required: true }
          ]
        }
      ]
    })
  },
  {
    id: 'onboarding-7d',
    name: 'Onboarding inicial de 7 días',
    category: 'Onboarding de cliente',
    outcome: 'Acelerar activación de nuevas cuentas con pasos simples.',
    problem: 'Los usuarios se registran pero no completan primeras acciones clave.',
    useWhen: 'Lanzas usuarios nuevos cada semana.',
    avoidWhen: 'No tienes definida una acción de “aha moment”.',
    setupMinutes: 5,
    difficulty: 'Intermedio',
    requirements: ['Email de bienvenida', 'Checklist de activación'],
    variables: [
      { id: 'flowName', label: 'Nombre del flujo', type: 'text', required: true, defaultValue: 'Onboarding 7 días' },
      { id: 'welcomeMessage', label: 'Mensaje de bienvenida', type: 'textarea', required: true, defaultValue: 'Bienvenido, te ayudaremos a lograr valor en minutos.' },
      { id: 'primaryAction', label: 'Acción principal de activación', type: 'text', required: true, defaultValue: 'Conectar tu primera integración' },
      { id: 'channel', label: 'Canal principal', type: 'select', required: true, defaultValue: 'Email', options: ['Email', 'In-app'] }
    ],
    addOns: ['Escalamiento a CSM', 'Encuesta de fricción'],
    benchmark: 'Activación esperada: +15% vs baseline',
    optimizationTip: 'Mide abandono por hito y simplifica el paso con más fricción.',
    kpis: ['Time to Launch', 'Completion por paso', 'Activación'],
    createWorkflow: (config) => ({
      name: String(config['flowName']),
      description: `Template onboarding con canal ${config['channel']}`,
      category: 'Onboarding de cliente',
      steps: [
        {
          id: 'step_1',
          title: 'Bienvenida',
          fields: [
            { id: 'email', type: 'email', label: 'Email del usuario', required: true },
            { id: 'welcome', type: 'longText', label: String(config['welcomeMessage']), required: true }
          ],
          navigation: { nextStep: 'step_2' }
        },
        {
          id: 'step_2',
          title: 'Primer hito',
          fields: [
            { id: 'primaryAction', type: 'shortText', label: `Hito: ${config['primaryAction']}`, required: true },
            { id: 'status', type: 'dropdown', label: 'Estado', required: true, options: ['Pendiente', 'Completado'] }
          ]
        }
      ]
    })
  },
  {
    id: 'support-triage',
    name: 'Triage de tickets con CSAT',
    category: 'Soporte y éxito del cliente',
    outcome: 'Ordenar tickets y cerrar con feedback de satisfacción.',
    problem: 'El soporte pierde prioridades y no mide calidad de cierre.',
    useWhen: 'Recibes tickets de distintos niveles de urgencia.',
    avoidWhen: 'No tienes definido SLA por severidad.',
    setupMinutes: 5,
    difficulty: 'Básico',
    requirements: ['Canal de entrada de tickets', 'Etiquetas de prioridad'],
    variables: [
      { id: 'flowName', label: 'Nombre del flujo', type: 'text', required: true, defaultValue: 'Triage de soporte' },
      { id: 'slaHours', label: 'SLA en horas', type: 'number', required: true, defaultValue: 24 },
      { id: 'closureMessage', label: 'Mensaje de cierre', type: 'textarea', required: true, defaultValue: '¿Te ayudó la solución? Califícanos del 1 al 5.' }
    ],
    addOns: ['Escalamiento automático', 'Reapertura de ticket'],
    benchmark: 'CSAT esperado: 4.2/5 o mayor',
    optimizationTip: 'Activa escalamiento si un ticket supera 70% del SLA sin respuesta.',
    kpis: ['Activation Rate', 'CSAT', 'Errores de validación'],
    createWorkflow: (config) => ({
      name: String(config['flowName']),
      description: `Template triage con SLA de ${config['slaHours']} horas`,
      category: 'Soporte y éxito del cliente',
      steps: [
        {
          id: 'step_1',
          title: 'Recepción de ticket',
          fields: [
            { id: 'issue', type: 'longText', label: 'Describe el problema', required: true },
            { id: 'priority', type: 'dropdown', label: 'Prioridad', required: true, options: ['Alta', 'Media', 'Baja'] }
          ],
          navigation: { nextStep: 'step_2' }
        },
        {
          id: 'step_2',
          title: 'Cierre + CSAT',
          fields: [
            { id: 'closureMessage', type: 'longText', label: String(config['closureMessage']), required: true },
            { id: 'csat', type: 'dropdown', label: 'CSAT', required: true, options: ['1', '2', '3', '4', '5'] }
          ]
        }
      ]
    })
  }
];

export const TEMPLATE_CATEGORIES = [
  'Quick Wins',
  'Captación y conversión',
  'Onboarding de cliente',
  'Ventas y seguimiento',
  'Soporte y éxito del cliente',
  'Retención y expansión',
  'Operación interna'
];
