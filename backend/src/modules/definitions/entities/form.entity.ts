import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId: string;

  @Column({ name: 'form_key' })
  formKey: string;

  @Column({ name: 'schema_json', type: jsonColumnType() })
  schemaJson: Record<string, unknown>;
}
