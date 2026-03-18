import { IsString, IsUUID, IsOptional, IsBoolean, Length, MaxLength } from 'class-validator';

export class CreateWorkflowDto {
  @IsUUID()
  applicationId!: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}
