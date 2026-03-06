import { IsString, IsUUID, Length } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 100)
  appKey: string;
}
