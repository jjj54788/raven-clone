import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.name, body.password);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('google')
  async googleLogin(@Body() body: GoogleLoginDto) {
    return this.authService.googleLogin(body.idToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() userId: string, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(userId, body);
  }
}
