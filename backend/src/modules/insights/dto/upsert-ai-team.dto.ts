import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AiAgentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(100)
  role!: string;

  @IsString()
  @MaxLength(100)
  model!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  focus?: string;
}

export class UpsertAiTeamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiAgentDto)
  agents!: AiAgentDto[];
}
