import { IsUUID, IsObject, IsInt, IsString, IsOptional, Length } from 'class-validator';

export class CreateWorkflowTransitionDto {
  @IsUUID()
  workflowId!: string;

  @IsUUID()
  organizationId!: string;

  @IsUUID()
  sourceNodeId!: string;

  @IsUUID()
  targetNodeId!: string;

  @IsOptional()
  @IsObject()
  conditionJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  label?: string;
}
