import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  appKey?: string;
}
