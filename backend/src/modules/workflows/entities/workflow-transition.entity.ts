import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: uuidColumnType() })
  workflowId!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'source_node_id', type: uuidColumnType() })
  sourceNodeId!: string;

  @Column({ name: 'target_node_id', type: uuidColumnType() })
  targetNodeId!: string;

  @Column({ name: 'condition_json', type: jsonColumnType(), nullable: true })
  conditionJson?: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label?: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
