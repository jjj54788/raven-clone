import { IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ResearchMemberDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(100)
  role!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  tasks?: number;
}

export class UpsertTeamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResearchMemberDto)
  members!: ResearchMemberDto[];
}
