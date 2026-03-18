import { IsString, IsOptional, IsBoolean, Length, MaxLength } from 'class-validator';

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
