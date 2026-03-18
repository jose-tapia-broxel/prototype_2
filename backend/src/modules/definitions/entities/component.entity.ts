import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('components')
export class Component {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'screen_id', type: uuidColumnType(), nullable: true })
  screenId?: string;

  @Column({ name: 'form_id', type: uuidColumnType(), nullable: true })
  formId?: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'component_type', type: 'varchar', length: 80 })
  componentType!: string;

  @Column({ name: 'config_json', type: jsonColumnType(), default: {} })
  configJson!: Record<string, unknown>;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
