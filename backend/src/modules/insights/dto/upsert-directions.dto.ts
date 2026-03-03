import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DirectionDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpsertDirectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectionDto)
  directions!: DirectionDto[];
}
