/**
 * Base interface for all domain events in the system.
 * Every event carries metadata for auditing and telemetry.
 */
export interface DomainEvent {
  /** Unique event type identifier (e.g., 'workflow.started', 'submission.processed') */
  readonly eventName: string;

  /** Category for grouping and filtering events */
  readonly eventCategory: EventCategory;

  /** Organization context (tenant isolation) */
  readonly organizationId: string;

  /** User who triggered the event (if applicable) */
  readonly actorId?: string;

  /** Type of entity this event relates to */
  readonly entityType?: string;

  /** ID of the related entity */
  readonly entityId?: string;

  /** Additional event-specific data */
  readonly metadata: Record<string, unknown>;

  /** Timestamp when the event occurred */
  readonly occurredAt: Date;
}

/**
 * Event categories as defined in the database schema.
 * Used for filtering and organizing telemetry data.
 */
export type EventCategory =
  | 'workflow'
  | 'submission'
  | 'rule'
  | 'user_action'
  | 'system'
  | 'error';

/**
 * Factory function to create a base domain event with defaults.
 */
export function createDomainEvent(
  partial: Omit<DomainEvent, 'occurredAt'> & { occurredAt?: Date },
): DomainEvent {
  return {
    ...partial,
    occurredAt: partial.occurredAt ?? new Date(),
  };
}
