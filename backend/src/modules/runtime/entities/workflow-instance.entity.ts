import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflow_instances')
@Index(['organizationId', 'applicationVersionId', 'workflowId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId: string;

  @Column({ name: 'workflow_id', type: uuidColumnType() })
  workflowId: string;

  @Column({ default: 'RUNNING' })
  status: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELED';

  @Column({ name: 'current_node_id', type: uuidColumnType(), nullable: true })
  currentNodeId?: string;

  @Column({ name: 'context_json', type: jsonColumnType(), default: '{}' })
  contextJson: Record<string, unknown>;

  @Column({ name: 'started_at', type: timestampColumnType() })
  startedAt: Date;

  @Column({ name: 'ended_at', type: timestampColumnType(), nullable: true })
  endedAt?: Date;
}
