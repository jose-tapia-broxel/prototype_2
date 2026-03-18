import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'schema_json', type: jsonColumnType(), default: [] })
  schemaJson!: unknown[];

  @Column({ name: 'created_by', type: uuidColumnType(), nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
