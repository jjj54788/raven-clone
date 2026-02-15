import { IsBoolean } from 'class-validator';

export class UpdateAuthSettingsDto {
  @IsBoolean()
  inviteOnly!: boolean;
}

