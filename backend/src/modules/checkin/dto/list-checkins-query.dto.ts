import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ListCheckInsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_KEY_RE)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_KEY_RE)
  to?: string;
}

