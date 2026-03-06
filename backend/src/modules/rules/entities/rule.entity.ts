import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'rule_key' })
  ruleKey: string;

  @Column({ default: 'jsonlogic' })
  engine: string;

  @Column({ name: 'expression_json', type: 'jsonb' })
  expressionJson: Record<string, unknown>;
}
