import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StreamChatDto {
  @IsString()
  @MaxLength(16000)
  message!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}

