import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId: string;

  @Column({ name: 'screen_key' })
  screenKey: string;

  @Column()
  name: string;

  @Column()
  route: string;

  @Column({ name: 'schema_json', type: jsonColumnType() })
  schemaJson: Record<string, unknown>;
}
