import { IsObject, IsUUID } from 'class-validator';

export class CreateVersionDto {
  @IsUUID()
  createdBy: string;

  @IsObject()
  definitionJson: Record<string, unknown>;
}
