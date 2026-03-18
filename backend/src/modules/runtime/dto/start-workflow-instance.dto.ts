import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class StartWorkflowInstanceDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  applicationId!: string;

  @IsUUID()
  applicationVersionId!: string;

  @IsUUID()
  workflowId!: string;

  @IsOptional()
  @IsObject()
  contextJson?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  startedBy?: string;
}
