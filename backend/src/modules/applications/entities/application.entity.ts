import { IsOptional } from 'class-validator';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('applications')
@Index(['organizationId', 'appKey'], { unique: true })
export class Application {
  @IsOptional()
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @IsOptional()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId?: string;

  @IsOptional()
  @Column({ name: 'app_key' })
  appKey?: string;

  @IsOptional()
  @Column()
  name?: string;

  @IsOptional()
  @Column({ name: 'current_published_version_id', type: 'uuid', nullable: true })
  currentPublishedVersionId?: string;
}
