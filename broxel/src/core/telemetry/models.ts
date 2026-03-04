export type EventType = 
  | 'WORKFLOW_STARTED'
  | 'STEP_VIEWED'
  | 'FIELD_INTERACTED'
  | 'VALIDATION_FAILED'
  | 'INTEGRATION_CALLED'
  | 'INTEGRATION_FAILED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_ABANDONED'
  | 'ERROR_THROWN';

export interface TelemetryEvent {
  // 1. Identificadores de Trazabilidad (Correlation IDs)
  eventId: string;          // UUID único del evento
  traceId: string;          // UUID de la sesión/instancia del workflow (agrupa todos los eventos de un usuario llenando un form)
  tenantId: string;         // Para multitenancy
  userId?: string;          // Nullable si es un formulario público anónimo
  
  // 2. Contexto del Recurso
  workflowId: string;       // ID de la definición del workflow
  workflowVersion: string;  // Versión específica (ej. "v1.2.0")
  stepId?: string;          // ID del paso actual
  fieldId?: string;         // ID del campo (si aplica)
  
  // 3. Datos del Evento
  type: EventType;
  timestamp: string;        // ISO 8601 UTC
  
  // 4. Métricas y Payload Estructurado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>; 
  
  // 5. Contexto del Cliente (Device/Browser)
  userAgent: string;
  url: string;
  durationMs?: number;      // Para medir latencias (ej. cuánto tardó una integración)
}

// Ejemplo de Metadata para un FIELD_INTERACTED:
// metadata: { timeSpentMs: 4500, valueLength: 12 }

// Ejemplo de Metadata para un VALIDATION_FAILED:
// metadata: { ruleId: 'regex_email', attemptedValue: 'invalid@' }

// Ejemplo de Metadata para un INTEGRATION_FAILED:
// metadata: { integrationId: 'salesforce_create_lead', statusCode: 503, errorMessage: 'Service Unavailable' }
