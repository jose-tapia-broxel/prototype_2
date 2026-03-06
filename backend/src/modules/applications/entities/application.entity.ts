import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('applications')
@Index(['organizationId', 'appKey'], { unique: true })
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'app_key' })
  appKey: string;

  @Column()
  name: string;

  @Column({ name: 'current_published_version_id', type: 'uuid', nullable: true })
  currentPublishedVersionId?: string;
}
