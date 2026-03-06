import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workflow_execution_logs')
@Index(['workflowInstanceId', 'createdAt'])
export class WorkflowExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_instance_id', type: 'uuid' })
  workflowInstanceId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'node_id', type: 'uuid', nullable: true })
  nodeId?: string;

  @Column({ name: 'payload_json', type: 'jsonb', default: {} })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
