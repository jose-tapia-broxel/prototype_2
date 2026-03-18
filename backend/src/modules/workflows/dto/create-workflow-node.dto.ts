import { IsString, IsUUID, IsObject, IsInt, IsBoolean, IsOptional, Length, IsIn } from 'class-validator';

export class CreateWorkflowNodeDto {
  @IsUUID()
  workflowId!: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsIn(['start', 'end', 'form', 'screen', 'decision', 'action', 'wait', 'parallel', 'sub_workflow'])
  nodeType!: 'start' | 'end' | 'form' | 'screen' | 'decision' | 'action' | 'wait' | 'parallel' | 'sub_workflow';

  @IsString()
  @Length(1, 200)
  label!: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  positionX?: number;

  @IsOptional()
  @IsInt()
  positionY?: number;

  @IsOptional()
  @IsBoolean()
  isStartNode?: boolean;

  @IsOptional()
  @IsBoolean()
  isEndNode?: boolean;
}
