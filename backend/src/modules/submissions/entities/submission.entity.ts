import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

export type SubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'application_id', type: uuidColumnType() })
  applicationId!: string;

  @Column({ name: 'workflow_instance_id', type: uuidColumnType(), nullable: true })
  workflowInstanceId?: string;

  @Column({ name: 'form_id', type: uuidColumnType(), nullable: true })
  formId?: string;

  @Column({ name: 'node_id', type: uuidColumnType(), nullable: true })
  nodeId?: string;

  @Column({ name: 'submitted_by', type: uuidColumnType(), nullable: true })
  submittedBy?: string;

  @Column({ name: 'data_json', type: jsonColumnType(), default: {} })
  dataJson!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: SubmissionStatus;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @Column({ name: 'processed_at', type: timestampColumnType(), nullable: true })
  processedAt?: Date;
}
