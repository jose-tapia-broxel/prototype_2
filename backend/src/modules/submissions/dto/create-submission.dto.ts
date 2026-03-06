import { IsObject, IsString, IsUUID, Length } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  applicationId: string;

  @IsUUID()
  applicationVersionId: string;

  @IsString()
  @Length(2, 120)
  workflowKey: string;

  @IsObject()
  payload: Record<string, unknown>;
}
