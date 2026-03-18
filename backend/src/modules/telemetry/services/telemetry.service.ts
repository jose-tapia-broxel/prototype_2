import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TelemetryEvent } from '../entities/telemetry-event.entity';
import { DomainEvent, EventCategory } from '../../events/interfaces';

/**
 * Query options for retrieving telemetry events.
 */
export interface TelemetryQueryOptions {
  organizationId: string;
  eventName?: string;
  eventCategory?: EventCategory;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Aggregated telemetry statistics.
 */
export interface TelemetryStats {
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  eventsByName: Record<string, number>;
  recentEvents: TelemetryEvent[];
}

/**
 * Retention policy configuration.
 */
export interface RetentionPolicy {
  /** Number of days to retain events (default: 90) */
  retentionDays: number;
  /** Whether cleanup is enabled (default: true) */
  enabled: boolean;
}

/**
 * Service for persisting and querying telemetry events.
 * Handles event storage, querying, aggregation, and retention policy enforcement.
 */
@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly retentionPolicy: RetentionPolicy;

  constructor(
    @InjectRepository(TelemetryEvent)
    private readonly telemetryRepository: Repository<TelemetryEvent>,
    private readonly configService: ConfigService,
  ) {
    this.retentionPolicy = {
      retentionDays: this.configService.get<number>('TELEMETRY_RETENTION_DAYS', 90),
      enabled: this.configService.get<boolean>('TELEMETRY_RETENTION_ENABLED', true),
    };
  }

  onModuleInit(): void {
    this.logger.log(
      `TelemetryService initialized [retentionDays=${this.retentionPolicy.retentionDays}, enabled=${this.retentionPolicy.enabled}]`,
    );
  }

  /**
   * Save a domain event to the telemetry store.
   */
  async saveEvent(event: DomainEvent): Promise<TelemetryEvent> {
    const telemetryEvent = this.telemetryRepository.create({
      organizationId: event.organizationId,
      eventName: event.eventName,
      eventCategory: event.eventCategory,
      actorId: event.actorId,
      entityType: event.entityType,
      entityId: event.entityId,
      metadataJson: event.metadata,
      createdAt: event.occurredAt,
    });

    const saved = await this.telemetryRepository.save(telemetryEvent);

    this.logger.debug(
      `Telemetry event saved: ${event.eventName} [id=${saved.id}, orgId=${event.organizationId}]`,
    );

    return saved;
  }

  /**
   * Save multiple domain events in a batch.
   */
  async saveEvents(events: DomainEvent[]): Promise<TelemetryEvent[]> {
    if (events.length === 0) return [];

    const telemetryEvents = events.map((event) =>
      this.telemetryRepository.create({
        organizationId: event.organizationId,
        eventName: event.eventName,
        eventCategory: event.eventCategory,
        actorId: event.actorId,
        entityType: event.entityType,
        entityId: event.entityId,
        metadataJson: event.metadata,
        createdAt: event.occurredAt,
      }),
    );

    const saved = await this.telemetryRepository.save(telemetryEvents);

    this.logger.debug(`Batch saved ${saved.length} telemetry events`);

    return saved;
  }

  /**
   * Query telemetry events with filtering options.
   */
  async queryEvents(options: TelemetryQueryOptions): Promise<TelemetryEvent[]> {
    const query = this.telemetryRepository.createQueryBuilder('te');

    query.where('te.organization_id = :organizationId', {
      organizationId: options.organizationId,
    });

    if (options.eventName) {
      query.andWhere('te.event_name = :eventName', { eventName: options.eventName });
    }

    if (options.eventCategory) {
      query.andWhere('te.event_category = :eventCategory', {
        eventCategory: options.eventCategory,
      });
    }

    if (options.entityType) {
      query.andWhere('te.entity_type = :entityType', { entityType: options.entityType });
    }

    if (options.entityId) {
      query.andWhere('te.entity_id = :entityId', { entityId: options.entityId });
    }

    if (options.actorId) {
      query.andWhere('te.actor_id = :actorId', { actorId: options.actorId });
    }

    if (options.fromDate) {
      query.andWhere('te.created_at >= :fromDate', { fromDate: options.fromDate });
    }

    if (options.toDate) {
      query.andWhere('te.created_at <= :toDate', { toDate: options.toDate });
    }

    query.orderBy('te.created_at', 'DESC');

    if (options.limit) {
      query.take(options.limit);
    }

    if (options.offset) {
      query.skip(options.offset);
    }

    return query.getMany();
  }

  /**
   * Get aggregated statistics for an organization.
   */
  async getStats(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<TelemetryStats> {
    const query = this.telemetryRepository.createQueryBuilder('te');

    query.where('te.organization_id = :organizationId', { organizationId });

    if (fromDate) {
      query.andWhere('te.created_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('te.created_at <= :toDate', { toDate });
    }

    // Total count
    const totalEvents = await query.getCount();

    // Count by category
    const categoryStats = await this.telemetryRepository
      .createQueryBuilder('te')
      .select('te.event_category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('te.organization_id = :organizationId', { organizationId })
      .groupBy('te.event_category')
      .getRawMany();

    const eventsByCategory: Record<string, number> = {};
    for (const stat of categoryStats) {
      eventsByCategory[stat.category] = parseInt(stat.count, 10);
    }

    // Count by event name (top 20)
    const nameStats = await this.telemetryRepository
      .createQueryBuilder('te')
      .select('te.event_name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('te.organization_id = :organizationId', { organizationId })
      .groupBy('te.event_name')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    const eventsByName: Record<string, number> = {};
    for (const stat of nameStats) {
      eventsByName[stat.name] = parseInt(stat.count, 10);
    }

    // Recent events (last 10)
    const recentEvents = await this.queryEvents({
      organizationId,
      limit: 10,
    });

    return {
      totalEvents,
      eventsByCategory: eventsByCategory as Record<EventCategory, number>,
      eventsByName,
      recentEvents,
    };
  }

  /**
   * Get event count grouped by time interval.
   */
  async getEventTimeline(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
    intervalHours: number = 1,
  ): Promise<Array<{ timestamp: Date; count: number }>> {
    // This is a simplified implementation - in production you might want
    // to use database-specific date truncation functions
    const events = await this.queryEvents({
      organizationId,
      fromDate,
      toDate,
      limit: 10000, // Cap for performance
    });

    const buckets = new Map<number, number>();
    const intervalMs = intervalHours * 60 * 60 * 1000;

    for (const event of events) {
      const bucketTime = Math.floor(event.createdAt.getTime() / intervalMs) * intervalMs;
      buckets.set(bucketTime, (buckets.get(bucketTime) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, count]) => ({ timestamp: new Date(timestamp), count }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get events for a specific entity (e.g., workflow instance history).
   */
  async getEntityHistory(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<TelemetryEvent[]> {
    return this.queryEvents({
      organizationId,
      entityType,
      entityId,
      limit: 100,
    });
  }

  /**
   * Delete old events based on retention policy.
   * Called automatically by the scheduler or can be invoked manually.
   */
  async enforceRetentionPolicy(): Promise<number> {
    if (!this.retentionPolicy.enabled) {
      this.logger.debug('Retention policy enforcement is disabled');
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.retentionDays);

    const result = await this.telemetryRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected ?? 0;

    if (deletedCount > 0) {
      this.logger.log(
        `Retention policy enforced: deleted ${deletedCount} events older than ${this.retentionPolicy.retentionDays} days`,
      );
    }

    return deletedCount;
  }

  /**
   * Scheduled task to enforce retention policy.
   * Runs daily at 3:00 AM.
   */
  // Note: @Cron decorator requires @nestjs/schedule module to be configured
  // Uncomment when schedule module is added:
  // @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledRetentionCleanup(): Promise<void> {
    this.logger.log('Starting scheduled retention cleanup...');
    try {
      await this.enforceRetentionPolicy();
    } catch (error) {
      this.logger.error(
        `Retention cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
