import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateAssistantDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

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
  @IsIn(['IDLE', 'RUNNING', 'DONE'])
  asStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
