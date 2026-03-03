import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportSectionDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  summary!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

export class UpsertReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportSectionDto)
  sections!: ReportSectionDto[];
}
