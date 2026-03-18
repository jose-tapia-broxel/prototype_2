import { IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateScreenDto {
  @IsUUID()
  applicationId!: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsObject()
  layoutJson?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}
