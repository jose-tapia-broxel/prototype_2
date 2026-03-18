import { IsString, IsObject, IsInt, IsBoolean, IsOptional, Length, IsIn } from 'class-validator';

export class UpdateWorkflowNodeDto {
  @IsOptional()
  @IsString()
  @IsIn(['start', 'end', 'form', 'screen', 'decision', 'action', 'wait', 'parallel', 'sub_workflow'])
  nodeType?: 'start' | 'end' | 'form' | 'screen' | 'decision' | 'action' | 'wait' | 'parallel' | 'sub_workflow';

  @IsOptional()
  @IsString()
  @Length(1, 200)
  label?: string;

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
