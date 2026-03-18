import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EventCategory } from '../../events/interfaces';

/**
 * DTO for querying telemetry events with validation.
 */
export class QueryTelemetryDto {
  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsEnum(['workflow', 'submission', 'rule', 'user_action', 'system', 'error'])
  eventCategory?: EventCategory;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * DTO for timeline query with validation.
 */
export class TimelineQueryDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  intervalHours?: number;
}

/**
 * DTO for entity history query with validation.
 */
export class EntityHistoryQueryDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;
}
