import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertCredibilityDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  overall!: number;

  @IsOptional()
  @IsArray()
  metrics?: unknown[];

  @IsOptional()
  @IsArray()
  sources?: unknown[];

  @IsOptional()
  @IsArray()
  timeliness?: unknown[];

  @IsOptional()
  @IsArray()
  coverage?: unknown[];

  @IsOptional()
  @IsArray()
  quality?: unknown[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  limitations?: string[];
}
