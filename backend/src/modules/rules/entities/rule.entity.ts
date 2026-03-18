import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId: string;

  @Column({ name: 'rule_key' })
  ruleKey: string;

  @Column({ default: 'jsonlogic' })
  engine: string;

  @Column({ name: 'expression_json', type: jsonColumnType() })
  expressionJson: Record<string, unknown>;
}
