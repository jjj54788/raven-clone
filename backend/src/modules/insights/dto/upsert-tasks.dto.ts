import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InsightTaskDto {
  @IsString()
  @MaxLength(20)
  taskId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  owner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpsertTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsightTaskDto)
  tasks!: InsightTaskDto[];
}
