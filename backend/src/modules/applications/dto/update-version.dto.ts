import { IsObject, IsOptional } from 'class-validator';

export class UpdateVersionDto {
  @IsOptional()
  @IsObject()
  definitionJson?: Record<string, unknown>;
}
