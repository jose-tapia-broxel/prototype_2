import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'screen_key' })
  screenKey: string;

  @Column()
  name: string;

  @Column()
  route: string;

  @Column({ name: 'schema_json', type: 'jsonb' })
  schemaJson: Record<string, unknown>;
}
