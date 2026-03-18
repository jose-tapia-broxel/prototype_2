import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEventsService, Subscription } from '../../events/services/domain-events.service';
import { TelemetryService } from './telemetry.service';
import { DomainEvent } from '../../events/interfaces';

/**
 * Telemetry event subscriber that listens to all domain events
 * and persists them to the telemetry store.
 * 
 * This provides a centralized, automatic way to capture all domain
 * events for observability purposes without requiring explicit
 * telemetry calls in domain services.
 */
@Injectable()
export class TelemetryEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(TelemetryEventSubscriber.name);
  private readonly subscriptions: Subscription[] = [];

  // Buffer for batch processing (reduces DB writes under high load)
  private eventBuffer: DomainEvent[] = [];
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private flushTimeout?: NodeJS.Timeout;

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly telemetryService: TelemetryService,
  ) {}

  /**
   * Subscribe to all domain events when module initializes.
   */
  onModuleInit(): void {
    this.subscribeToAllEvents();
    this.startFlushTimer();
    this.logger.log('TelemetryEventSubscriber initialized and subscribed to all domain events');
  }

  /**
   * Subscribe to all events using wildcard category subscription.
   */
  private subscribeToAllEvents(): void {
    // Subscribe to all events using the '*' wildcard
    const subscription = this.domainEventsService.onCategory('*', (event) => {
      this.handleEvent(event);
    });

    this.subscriptions.push(subscription);
  }

  /**
   * Handle incoming domain event.
   * Events are buffered for batch processing.
   */
  private handleEvent(event: DomainEvent): void {
    this.eventBuffer.push(event);

    // Flush immediately if buffer is full
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      void this.flushBuffer();
    }
  }

  /**
   * Flush the event buffer to the database.
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.telemetryService.saveEvents(events);
      this.logger.debug(`Flushed ${events.length} events to telemetry store`);
    } catch (error) {
      this.logger.error(
        `Failed to flush events to telemetry: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Re-add events to buffer for retry (with size limit to prevent memory issues)
      if (this.eventBuffer.length < 100) {
        this.eventBuffer.unshift(...events);
      }
    }
  }

  /**
   * Start periodic flush timer.
   */
  private startFlushTimer(): void {
    this.flushTimeout = setInterval(() => {
      void this.flushBuffer();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Cleanup on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    // Clear timeout
    if (this.flushTimeout) {
      clearInterval(this.flushTimeout);
    }

    // Unsubscribe from all events
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }

    // Flush remaining events
    await this.flushBuffer();

    this.logger.log('TelemetryEventSubscriber destroyed');
  }
}
