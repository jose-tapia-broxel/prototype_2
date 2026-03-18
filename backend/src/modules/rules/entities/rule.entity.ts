import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

export type RuleType = 'condition' | 'validation' | 'calculation' | 'routing';

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 50, default: 'condition' })
  ruleType: RuleType;

  @Column({ name: 'condition_json', type: jsonColumnType() })
  conditionJson: Record<string, unknown>;

  @Column({ name: 'action_json', type: jsonColumnType(), default: {} })
  actionJson: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: uuidColumnType(), nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt: Date;
}
