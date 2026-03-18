import { IsArray, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateFormDto {
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
  @IsArray()
  schemaJson?: unknown[];

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}
