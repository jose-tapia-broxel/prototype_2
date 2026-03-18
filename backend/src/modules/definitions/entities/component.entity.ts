import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('components')
export class Component {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId: string;

  @Column({ name: 'component_key' })
  componentKey: string;

  @Column({ name: 'component_type' })
  componentType: string;

  @Column({ name: 'props_json', type: jsonColumnType() })
  propsJson: Record<string, unknown>;
}
