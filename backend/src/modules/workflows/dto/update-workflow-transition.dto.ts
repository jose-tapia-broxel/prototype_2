import { IsObject, IsInt, IsString, IsOptional, Length } from 'class-validator';

export class UpdateWorkflowTransitionDto {
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
