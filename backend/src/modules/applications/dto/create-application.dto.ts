import { IsString, IsUUID, Length } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  organizationId!: string; // Notice the '!' here

  @IsString()
  @Length(2, 100)
  name!: string;           // And here

  @IsString()
  @Length(2, 100)
  appKey!: string;         // And here
}