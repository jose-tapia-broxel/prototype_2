import { IsInt, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpdateComponentDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  componentType?: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
