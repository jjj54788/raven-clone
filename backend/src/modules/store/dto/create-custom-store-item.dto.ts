import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import type { StoreItemPricing, StoreItemType } from '../store.types';

export class CreateCustomStoreItemDto {
  @IsIn(['tool', 'skill'])
  type!: StoreItemType;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(220)
  description!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  iconText?: string;

  @IsOptional()
  @IsIn(['free', 'freemium', 'paid', 'open_source'])
  pricing?: StoreItemPricing;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  trialNotesMarkdown?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  recommendReasons?: string[];
}

