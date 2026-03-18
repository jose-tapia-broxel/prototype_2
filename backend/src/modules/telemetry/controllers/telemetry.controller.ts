import { Controller, Get, Query, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { TelemetryService, TelemetryQueryOptions, TelemetryStats } from '../services/telemetry.service';
import { TelemetryEvent } from '../entities/telemetry-event.entity';
import { QueryTelemetryDto, TimelineQueryDto, EntityHistoryQueryDto } from '../dto';

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  /**
   * Get telemetry usage summary for the organization.
   */
  @Get('usage')
  async getUsage(
    @TenantId() orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<TelemetryStats> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    return this.telemetryService.getStats(orgId, fromDate, toDate);
  }

  /**
   * Query telemetry events with filters.
   */
  @Get('events')
  async queryEvents(
    @TenantId() orgId: string,
    @Query() query: QueryTelemetryDto,
  ): Promise<TelemetryEvent[]> {
    const options: TelemetryQueryOptions = {
      organizationId: orgId,
      eventName: query.eventName,
      eventCategory: query.eventCategory,
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    };

    return this.telemetryService.queryEvents(options);
  }

  /**
   * Get event timeline for charts/visualizations.
   */
  @Get('timeline')
  async getTimeline(
    @TenantId() orgId: string,
    @Query() query: TimelineQueryDto,
  ): Promise<Array<{ timestamp: Date; count: number }>> {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);
    const interval = query.intervalHours ?? 1;

    return this.telemetryService.getEventTimeline(orgId, fromDate, toDate, interval);
  }

  /**
   * Get history of events for a specific entity (e.g., workflow instance).
   */
  @Get('entity-history')
  async getEntityHistory(
    @TenantId() orgId: string,
    @Query() query: EntityHistoryQueryDto,
  ): Promise<TelemetryEvent[]> {
    return this.telemetryService.getEntityHistory(orgId, query.entityType, query.entityId);
  }

  /**
   * Manually trigger retention policy cleanup (admin only in production).
   */
  @Post('cleanup')
  async triggerCleanup(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.telemetryService.enforceRetentionPolicy();
    return { deletedCount };
  }
}
