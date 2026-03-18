import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class UpdateScreenDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @IsOptional()
  @IsObject()
  layoutJson?: Record<string, unknown>;
}
