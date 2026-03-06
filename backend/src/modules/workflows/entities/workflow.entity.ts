import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_version_id', type: 'uuid' })
  applicationVersionId: string;

  @Column({ name: 'workflow_key' })
  workflowKey: string;

  @Column()
  name: string;
}
