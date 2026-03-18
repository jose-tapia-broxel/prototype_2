import { IsInt, IsObject, IsOptional, IsString, IsUUID, Length, ValidateIf } from 'class-validator';

export class CreateComponentDto {
  @ValidateIf(o => !o.formId)
  @IsUUID()
  screenId?: string;

  @ValidateIf(o => !o.screenId)
  @IsUUID()
  formId?: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @Length(1, 80)
  componentType!: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
