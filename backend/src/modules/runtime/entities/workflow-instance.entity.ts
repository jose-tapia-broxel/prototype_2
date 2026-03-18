import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

export type WorkflowInstanceStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

@Entity('workflow_instances')
@Index(['organizationId', 'applicationVersionId', 'workflowId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId!: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId!: string;

  @Column({ name: 'workflow_id', type: uuidColumnType() })
  workflowId!: string;

  @Column({ name: 'current_node_id', type: uuidColumnType(), nullable: true })
  currentNodeId?: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: WorkflowInstanceStatus;

  @Column({ name: 'context_json', type: jsonColumnType(), default: {} })
  contextJson!: Record<string, unknown>;

  @Column({ name: 'started_by', type: uuidColumnType(), nullable: true })
  startedBy?: string;

  @CreateDateColumn({ name: 'started_at', type: timestampColumnType() })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: timestampColumnType(), nullable: true })
  endedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
