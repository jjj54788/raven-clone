import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { StoreItemType } from '../store.types';

export class ListStoreItemsQueryDto {
  @IsOptional()
  @IsIn(['tool', 'skill'])
  type?: StoreItemType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsIn(['rating', 'users', 'name'])
  sort?: 'rating' | 'users' | 'name';

  @IsOptional()
  @IsIn(['1', '0', 'true', 'false'])
  featured?: string;
}

