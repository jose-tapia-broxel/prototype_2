import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('components')
export class Component {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'component_key' })
  componentKey: string;

  @Column({ name: 'component_type' })
  componentType: string;

  @Column({ name: 'props_json', type: 'jsonb' })
  propsJson: Record<string, unknown>;
}
