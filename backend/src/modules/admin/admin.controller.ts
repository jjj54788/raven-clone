import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateAuthSettingsDto } from './dto/update-auth-settings.dto';
import { CreateAllowlistEmailDto } from './dto/create-allowlist-email.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('auth/settings')
  getAuthSettings() {
    return this.adminService.getAuthSettings();
  }

  @Patch('auth/settings')
  setInviteOnly(@Body() body: UpdateAuthSettingsDto) {
    return this.adminService.setInviteOnly(body.inviteOnly);
  }

  @Get('auth/allowlist')
  listAllowlist() {
    return this.adminService.listAllowlistEmails();
  }

  @Post('auth/allowlist')
  addAllowlist(@Body() body: CreateAllowlistEmailDto) {
    return this.adminService.addAllowlistEmail(body);
  }

  @Delete('auth/allowlist/:id')
  deleteAllowlist(@Param('id') id: string) {
    return this.adminService.deleteAllowlistEmail(id);
  }

  @Get('users')
  listUsers(@Query('q') q?: string) {
    return this.adminService.listUsers({ q });
  }

  @Patch('users/:id')
  setUserRole(@Param('id') id: string, @Body() body: UpdateUserRoleDto) {
    return this.adminService.setUserAdmin(id, body.isAdmin);
  }
}
