import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TelemetryEvent, EventType } from './models';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  // 1. Pipeline de Recolección (Buffer Local)
  private eventBuffer: TelemetryEvent[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private flushTimer: any;

  // 2. Trazabilidad por Instancia (Correlation ID)
  private currentTraceId: string | null = null;
  private currentWorkflowId: string | null = null;
  private currentTenantId: string | null = null;
  private currentUserId: string | null = null;
  private recentEvents: TelemetryEvent[] = [];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Iniciar el flush periódico (cada 5 segundos)
      this.startFlushTimer();
      
      // Flush final antes de que el usuario cierre la pestaña
      window.addEventListener('beforeunload', () => this.flushNow());
    }
  }

  /**
   * Inicializa una nueva sesión de workflow (Genera un Trace ID)
   */
  startSession(workflowId: string, tenantId: string, userId?: string) {
    this.currentTraceId = crypto.randomUUID();
    this.currentWorkflowId = workflowId;
    this.currentTenantId = tenantId;
    this.currentUserId = userId || null;

    this.trackEvent('WORKFLOW_STARTED', {
      userAgent: isPlatformBrowser(this.platformId) ? navigator.userAgent : 'server',
      url: isPlatformBrowser(this.platformId) ? window.location.href : 'server'
    });
  }

  /**
   * Registra un evento en el buffer local
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackEvent(type: EventType, metadata: Record<string, any> = {}, stepId?: string, fieldId?: string, durationMs?: number) {
    if (!this.currentTraceId || !this.currentWorkflowId || !this.currentTenantId) {
      console.warn('TelemetryService: Session not started. Cannot track event.');
      return;
    }

    const event: TelemetryEvent = {
      eventId: crypto.randomUUID(),
      traceId: this.currentTraceId,
      tenantId: this.currentTenantId,
      userId: this.currentUserId || undefined,
      workflowId: this.currentWorkflowId,
      workflowVersion: 'latest', // Idealmente, esto vendría de la definición
      stepId,
      fieldId,
      type,
      timestamp: new Date().toISOString(),
      metadata,
      userAgent: isPlatformBrowser(this.platformId) ? navigator.userAgent : 'server',
      url: isPlatformBrowser(this.platformId) ? window.location.href : 'server',
      durationMs
    };

    this.eventBuffer.push(event);
    this.recentEvents.push(event);
    if (this.recentEvents.length > 200) {
      this.recentEvents = this.recentEvents.slice(-200);
    }

    // Si el buffer está lleno, forzar el envío inmediato
    if (this.eventBuffer.length >= this.BATCH_SIZE) {
      this.flushNow();
    }
  }

  /**
   * Envía los eventos acumulados al backend (Batching)
   */
  private flushNow() {
    if (this.eventBuffer.length === 0 || !isPlatformBrowser(this.platformId)) return;

    const payload = [...this.eventBuffer];
    this.eventBuffer = []; // Limpiar el buffer inmediatamente

    // Usar sendBeacon para garantizar la entrega incluso si la página se está cerrando
    // En un entorno real, esto apuntaría a tu API de ingesta (ej. /api/telemetry/batch)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const success = navigator.sendBeacon('/api/telemetry/batch', blob);

    if (!success) {
      // Fallback a fetch si sendBeacon falla (raro, pero posible)
      fetch('/api/telemetry/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true // Importante para peticiones al cerrar la página
      }).then(res => {
        // Clone the response to avoid "Response body object should not be disturbed or locked"
        return res.clone().json();
      }).catch(err => console.error('Telemetry flush failed:', err));
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushNow();
    }, this.FLUSH_INTERVAL_MS);
  }

  ngOnDestroy() {
    clearInterval(this.flushTimer);
    this.flushNow();
  }

  getRecentEvents(limit = 50): TelemetryEvent[] {
    return this.recentEvents.slice(-Math.max(1, limit));
  }
}
