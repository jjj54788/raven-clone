import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}
