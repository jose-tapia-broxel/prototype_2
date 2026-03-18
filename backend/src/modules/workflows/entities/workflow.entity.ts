import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_version_id', type: uuidColumnType() })
  applicationVersionId!: string;

  @Column({ name: 'workflow_key' })
  workflowKey!: string;

  @Column()
  name!: string;
}
