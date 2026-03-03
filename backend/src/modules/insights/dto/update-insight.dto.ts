import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { InsightCategoryDto, InsightVisibilityDto, InsightIconDto } from './create-insight.dto';

export class UpdateInsightDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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
