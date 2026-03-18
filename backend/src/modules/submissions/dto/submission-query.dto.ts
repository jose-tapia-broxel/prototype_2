import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SubmissionStatus } from '../entities/submission.entity';

export class SubmissionQueryDto {
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'rejected'])
  status?: SubmissionStatus;

  @IsOptional()
  @IsUUID()
  workflowInstanceId?: string;

  @IsOptional()
  @IsUUID()
  formId?: string;
}
