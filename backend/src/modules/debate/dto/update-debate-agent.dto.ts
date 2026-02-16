import { IsEnum, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';
import { DebateAgentCategory } from '@prisma/client';

export class UpdateDebateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsEnum(DebateAgentCategory)
  category?: DebateAgentCategory;
}
