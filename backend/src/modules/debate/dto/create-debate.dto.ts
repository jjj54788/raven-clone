import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDebateDto {
  @IsString()
  @MaxLength(300)
  topic!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsString({ each: true })
  agentIds!: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRounds?: number;
}
