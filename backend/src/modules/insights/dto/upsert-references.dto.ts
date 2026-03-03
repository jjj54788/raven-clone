import { IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReferenceDto {
  @IsString()
  @MaxLength(20)
  refId!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(200)
  domain!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;
}

export class UpsertReferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  refs!: ReferenceDto[];
}
