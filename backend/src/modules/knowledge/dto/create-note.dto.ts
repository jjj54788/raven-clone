import { IsArray, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateKnowledgeNoteDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(100_000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  sourceUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
