import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMissionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  leaderAssistantId?: string;

  @IsOptional()
  @IsEmail()
  notificationEmail?: string;
}
