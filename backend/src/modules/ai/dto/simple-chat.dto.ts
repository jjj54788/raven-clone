import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { ChatMessageDto } from './chat-message.dto';

export class SimpleChatDto {
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages?: ChatMessageDto[];
}
