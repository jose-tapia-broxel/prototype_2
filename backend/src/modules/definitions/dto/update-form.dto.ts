import { IsArray, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsArray()
  schemaJson?: unknown[];
}
