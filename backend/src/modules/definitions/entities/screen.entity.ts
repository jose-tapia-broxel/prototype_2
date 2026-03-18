import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'layout_json', type: jsonColumnType(), default: {} })
  layoutJson!: Record<string, unknown>;

  @Column({ name: 'created_by', type: uuidColumnType(), nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
