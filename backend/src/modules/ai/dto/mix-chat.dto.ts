import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class MixChatDto {
  @IsString()
  @MaxLength(16000)
  message!: string;

  /** 2–5 model IDs to query in parallel */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  models!: string[];

  /** Optional: which model to use for synthesis (defaults to first in the list) */
  @IsOptional()
  @IsString()
  synthesisModel?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}
