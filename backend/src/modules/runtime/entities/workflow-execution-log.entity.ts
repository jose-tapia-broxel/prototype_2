import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflow_execution_logs')
@Index(['workflowInstanceId', 'createdAt'])
export class WorkflowExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_instance_id', type: uuidColumnType() })
  workflowInstanceId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ name: 'node_id', type: uuidColumnType(), nullable: true })
  nodeId?: string;

  @Column({ name: 'actor_id', type: uuidColumnType(), nullable: true })
  actorId?: string;

  @Column({ name: 'payload_json', type: jsonColumnType(), default: {} })
  payloadJson!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;
}
