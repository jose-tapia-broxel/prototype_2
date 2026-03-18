import { IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  applicationId: string;

  @IsUUID()
  @IsOptional()
  applicationVersionId?: string;

  @IsUUID()
  @IsOptional()
  workflowInstanceId?: string;

  @IsUUID()
  @IsOptional()
  formId?: string;

  @IsUUID()
  @IsOptional()
  nodeId?: string;

  @IsString()
  @Length(2, 120)
  @IsOptional()
  workflowKey?: string;

  @IsObject()
  payload: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  submittedBy?: string;
}
