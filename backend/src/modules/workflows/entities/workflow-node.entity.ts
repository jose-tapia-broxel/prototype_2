import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflow_nodes')
export class WorkflowNode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: uuidColumnType() })
  workflowId!: string;

  @Column({ name: 'node_key' })
  nodeKey!: string;

  @Column({ name: 'node_type' })
  nodeType!: 'start' | 'task' | 'decision' | 'integration' | 'end';

  @Column({ name: 'config_json', type: jsonColumnType(), nullable: true })
  configJson?: Record<string, unknown>;
}
