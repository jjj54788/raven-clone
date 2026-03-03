import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAssistantDto {
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @MaxLength(200)
  modelId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleDescription?: string;

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  catalogId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  iconText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accent?: string;

  @IsOptional()
  @IsIn(['IDLE', 'RUNNING', 'DONE'])
  asStatus?: string;
}
