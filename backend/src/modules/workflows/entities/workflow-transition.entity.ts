import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: uuidColumnType() })
  workflowId!: string;

  @Column({ name: 'from_node_id', type: uuidColumnType() })
  fromNodeId!: string;

  @Column({ name: 'to_node_id', type: uuidColumnType() })
  toNodeId!: string;

  @Column({ name: 'condition_rule_id', type: uuidColumnType(), nullable: true })
  conditionRuleId?: string;

  @Column({ type: 'int', default: 100 })
  priority!: number;
}
