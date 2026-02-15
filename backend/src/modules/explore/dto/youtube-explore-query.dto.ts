import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class YoutubeExploreQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keywords?: string;

  @IsOptional()
  @IsIn(['latest', 'oldest', 'relevance'])
  order?: 'latest' | 'oldest' | 'relevance';

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(25)
  maxResults?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageToken?: string;
}
