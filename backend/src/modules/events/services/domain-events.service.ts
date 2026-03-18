import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import { DomainEvent, EventCategory } from '../interfaces';

/**
 * Event handler function type.
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

/**
 * Options for event subscription.
 */
export interface SubscriptionOptions {
  /** If true, handler is called only once then removed */
  once?: boolean;
  /** Priority for handler execution (higher = earlier). Default: 0 */
  priority?: number;
}

/**
 * Subscription result for unsubscribing.
 */
export interface Subscription {
  unsubscribe: () => void;
}

/**
 * Central event bus service for domain events.
 * Uses Node.js EventEmitter for in-process event dispatch.
 * 
 * Features:
 * - Type-safe event emission and subscription
 * - Wildcard subscriptions (e.g., 'workflow.*')
 * - Category-based subscriptions
 * - Async handler support
 * - Error isolation (one failing handler doesn't break others)
 */
@Injectable()
export class DomainEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(DomainEventsService.name);
  private readonly emitter = new EventEmitter();
  private readonly categoryHandlers = new Map<EventCategory | '*', Set<EventHandler>>();

  constructor() {
    // Increase max listeners to avoid warnings in large applications
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit a domain event to all registered handlers.
   * Handlers are executed asynchronously and independently.
   * 
   * Supports two signatures for backward compatibility:
   * - emit(event: DomainEvent) - new typed event format
   * - emit(eventName: string, payload: object) - legacy format (auto-converted)
   */
  async emit<T extends DomainEvent>(
    eventOrName: T | string,
    legacyPayload?: Record<string, unknown>,
  ): Promise<void> {
    const startTime = Date.now();

    // Handle legacy emit(eventName, payload) signature
    let event: DomainEvent;
    if (typeof eventOrName === 'string') {
      event = this.createLegacyEvent(eventOrName, legacyPayload ?? {});
    } else {
      event = eventOrName;
    }

    this.logger.debug(
      `Emitting event: ${event.eventName} [category=${event.eventCategory}, entityType=${event.entityType ?? 'N/A'}, entityId=${event.entityId ?? 'N/A'}]`,
    );

    try {
      // Emit to specific event name handlers
      this.emitter.emit(event.eventName, event);

      // Emit to wildcard handlers (e.g., 'workflow.*' matches 'workflow.started')
      const [prefix] = event.eventName.split('.');
      if (prefix) {
        this.emitter.emit(`${prefix}.*`, event);
      }

      // Emit to category handlers
      await this.notifyCategoryHandlers(event);

      // Emit to global wildcard handlers
      this.emitter.emit('*', event);

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Event emitted: ${event.eventName} [orgId=${event.organizationId}, durationMs=${durationMs}]`,
      );
    } catch (error) {
      this.logger.error(
        `Error emitting event ${event.eventName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Convert legacy (eventName, payload) format to DomainEvent.
   * Infers category from event name prefix.
   */
  private createLegacyEvent(
    eventName: string,
    payload: Record<string, unknown>,
  ): DomainEvent {
    // Infer category from event name prefix
    const category = this.inferCategory(eventName);

    return {
      eventName,
      eventCategory: category,
      organizationId: (payload.organizationId as string) ?? 'unknown',
      actorId: payload.actorId as string | undefined,
      entityType: payload.entityType as string | undefined,
      entityId: payload.entityId as string | undefined,
      metadata: payload,
      occurredAt: new Date(),
    };
  }

  /**
   * Infer event category from event name.
   */
  private inferCategory(eventName: string): EventCategory {
    const prefix = eventName.split('.')[0];
    const categoryMap: Record<string, EventCategory> = {
      workflow: 'workflow',
      submission: 'submission',
      rule: 'rule',
      ruleset: 'rule',
      user: 'user_action',
      application: 'system',
      system: 'system',
      error: 'error',
    };
    return categoryMap[prefix] ?? 'system';
  }

  /**
   * Subscribe to events by exact event name.
   * @param eventName - Exact event name (e.g., 'workflow.started') or wildcard (e.g., 'workflow.*')
   * @param handler - Handler function to call when event is emitted
   * @param options - Subscription options
   * @returns Subscription object with unsubscribe method
   */
  on<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {},
  ): Subscription {
    const wrappedHandler = this.wrapHandler(eventName, handler);

    if (options.once) {
      this.emitter.once(eventName, wrappedHandler);
    } else {
      this.emitter.on(eventName, wrappedHandler);
    }

    this.logger.debug(`Handler subscribed to: ${eventName}`);

    return {
      unsubscribe: () => {
        this.emitter.off(eventName, wrappedHandler);
        this.logger.debug(`Handler unsubscribed from: ${eventName}`);
      },
    };
  }

  /**
   * Subscribe to events by exact event name, only called once.
   */
  once<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): Subscription {
    return this.on(eventName, handler, { once: true });
  }

  /**
   * Subscribe to all events in a category.
   * @param category - Event category or '*' for all events
   * @param handler - Handler function
   */
  onCategory(category: EventCategory | '*', handler: EventHandler): Subscription {
    if (!this.categoryHandlers.has(category)) {
      this.categoryHandlers.set(category, new Set());
    }
    this.categoryHandlers.get(category)!.add(handler);

    this.logger.debug(`Handler subscribed to category: ${category}`);

    return {
      unsubscribe: () => {
        this.categoryHandlers.get(category)?.delete(handler);
        this.logger.debug(`Handler unsubscribed from category: ${category}`);
      },
    };
  }

  /**
   * Remove all handlers for an event name.
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.emitter.removeAllListeners(eventName);
    } else {
      this.emitter.removeAllListeners();
      this.categoryHandlers.clear();
    }
  }

  /**
   * Get count of listeners for an event name.
   */
  listenerCount(eventName: string): number {
    return this.emitter.listenerCount(eventName);
  }

  /**
   * Cleanup on module destroy.
   */
  onModuleDestroy(): void {
    this.removeAllListeners();
    this.logger.log('DomainEventsService destroyed, all listeners removed');
  }

  /**
   * Wrap handler with error isolation and logging.
   */
  private wrapHandler<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): EventHandler<T> {
    return async (event: T) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Handler error for event ${eventName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        // Don't rethrow - isolate handler failures
      }
    };
  }

  /**
   * Notify all category handlers for an event.
   */
  private async notifyCategoryHandlers(event: DomainEvent): Promise<void> {
    const categorySet = this.categoryHandlers.get(event.eventCategory);
    const wildcardSet = this.categoryHandlers.get('*');

    const allHandlers = [
      ...(categorySet ?? []),
      ...(wildcardSet ?? []),
    ];

    await Promise.all(
      allHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(
            `Category handler error for ${event.eventCategory}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }),
    );
  }
}
