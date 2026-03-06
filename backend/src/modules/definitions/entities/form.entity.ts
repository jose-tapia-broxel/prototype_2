import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'form_key' })
  formKey: string;

  @Column({ name: 'schema_json', type: 'jsonb' })
  schemaJson: Record<string, unknown>;
}
