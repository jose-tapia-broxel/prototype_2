import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId!: string;

  @Column({ name: 'from_node_id', type: 'uuid' })
  fromNodeId!: string;

  @Column({ name: 'to_node_id', type: 'uuid' })
  toNodeId!: string;

  @Column({ name: 'condition_rule_id', type: 'uuid', nullable: true })
  conditionRuleId?: string;

  @Column({ type: 'int', default: 100 })
  priority!: number;
}
