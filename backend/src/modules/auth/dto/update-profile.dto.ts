import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProfileSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  userBubble?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  aiBubble?: string;

  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyWeekly?: boolean;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsIn(['en', 'zh'])
  locale?: 'en' | 'zh';
}

class ProfileIntegrationsDto {
  @IsOptional()
  @IsBoolean()
  notion?: boolean;

  @IsOptional()
  @IsBoolean()
  drive?: boolean;

  @IsOptional()
  @IsBoolean()
  feishu?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  feishuOpenId?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(48, { each: true })
  interests?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProfileSettingsDto)
  settings?: ProfileSettingsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProfileIntegrationsDto)
  integrations?: ProfileIntegrationsDto;
}
