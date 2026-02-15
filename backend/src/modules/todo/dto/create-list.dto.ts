import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTodoListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  color?: string;
}

