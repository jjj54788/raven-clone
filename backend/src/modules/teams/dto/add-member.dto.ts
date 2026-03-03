import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { TeamMemberRole } from '@prisma/client';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole;
}
