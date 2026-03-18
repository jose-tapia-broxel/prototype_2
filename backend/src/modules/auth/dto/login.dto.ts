import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  /** Organization slug (e.g. "acme-corp") */
  @IsString()
  @Length(2, 120)
  orgSlug: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 128)
  password: string;
}
