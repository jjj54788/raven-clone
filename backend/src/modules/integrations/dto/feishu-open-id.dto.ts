import { IsString, MaxLength, MinLength } from 'class-validator';

export class FeishuOpenIdDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  openId!: string;
}
