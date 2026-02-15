import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAllowlistEmailDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

