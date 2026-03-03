import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum InsightCategoryDto {
  MACRO = '宏观洞察',
  TECH = '技术趋势',
  CORP = '企业追踪',
}

export enum InsightVisibilityDto {
  PUBLIC = '公开',
  PRIVATE = '私有',
}

export enum InsightIconDto {
  GLOBE = 'globe',
  CHIP = 'chip',
  BUILDING = 'building',
  NETWORK = 'network',
}

export class CreateInsightDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsOptional()
  @IsEnum(InsightCategoryDto)
  category?: InsightCategoryDto;

  @IsOptional()
  @IsEnum(InsightVisibilityDto)
  visibility?: InsightVisibilityDto;

  @IsOptional()
  @IsEnum(InsightIconDto)
  icon?: InsightIconDto;
}
