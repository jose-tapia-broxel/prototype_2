import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('application_versions')
@Index(['applicationId', 'versionNumber'], { unique: true })
export class ApplicationVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column({ name: 'status', type: 'varchar', default: 'DRAFT' })
  status!: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @Column({ name: 'definition_json', type: jsonColumnType() })
  definitionJson!: Record<string, unknown>;

  @Column({ name: 'definition_hash', type: 'varchar', length: 128 })
  definitionHash!: string;

  @Column({ name: 'published_at', type: timestampColumnType(), nullable: true })
  publishedAt?: Date;

  @Column({ name: 'created_by', type: uuidColumnType() })
  createdBy!: string;
}
