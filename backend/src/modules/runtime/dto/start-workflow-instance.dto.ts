import { IsObject, IsUUID } from 'class-validator';

export class StartWorkflowInstanceDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  applicationId: string;

  @IsUUID()
  applicationVersionId: string;

  @IsUUID()
  workflowId: string;

  @IsObject()
  contextJson: Record<string, unknown>;
}
