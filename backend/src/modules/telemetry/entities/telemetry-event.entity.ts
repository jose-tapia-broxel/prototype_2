import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import {
  jsonColumnType,
  uuidColumnType,
  timestampColumnType,
} from '../../../infrastructure/database/column-types';
import { EventCategory } from '../../events/interfaces';

/**
 * TelemetryEvent entity maps to the telemetry_events table.
 * Stores all domain events for observability and analytics.
 */
@Entity('telemetry_events')
@Index('idx_telemetry_org_created', ['organizationId', 'createdAt'])
@Index('idx_telemetry_event_name', ['eventName'])
@Index('idx_telemetry_entity', ['entityType', 'entityId'])
export class TelemetryEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'event_name', type: 'varchar', length: 150 })
  eventName!: string;

  @Column({ name: 'event_category', type: 'varchar', length: 50 })
  eventCategory!: EventCategory;

  @Column({ name: 'actor_id', type: uuidColumnType(), nullable: true })
  actorId?: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 80, nullable: true })
  entityType?: string;

  @Column({ name: 'entity_id', type: uuidColumnType(), nullable: true })
  entityId?: string;

  @Column({ name: 'metadata_json', type: jsonColumnType(), default: {} })
  metadataJson!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;
}
