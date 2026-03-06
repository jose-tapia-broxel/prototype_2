import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workflow_instances')
@Index(['organizationId', 'applicationVersionId', 'workflowId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ default: 'RUNNING' })
  status: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELED';

  @Column({ name: 'current_node_id', type: 'uuid', nullable: true })
  currentNodeId?: string;

  @Column({ name: 'context_json', type: 'jsonb', default: {} })
  contextJson: Record<string, unknown>;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;
}
