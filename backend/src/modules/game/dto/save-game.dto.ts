import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveGameDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsObject()
  gameState!: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @Max(9999)
  daysSurvived!: number;

  @IsInt()
  @Min(0)
  score!: number;

  @IsOptional()
  @IsBoolean()
  isAutosave?: boolean;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  saveId?: string;
}
