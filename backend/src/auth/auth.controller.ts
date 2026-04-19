import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from './admin-auth.guard';
import { AuthService } from './auth.service';
import { AdminLoginDto, AdminSignupDto } from './dto/admin-auth.dto';

@ApiTags('auth')
@Controller('auth/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Secure admin signup using the configured invite key' })
  signup(@Body() body: AdminSignupDto) {
    return this.authService.signupAdmin(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  login(@Body() body: AdminLoginDto) {
    return this.authService.loginAdmin(body);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated admin profile' })
  me(@Req() req: any) {
    return this.authService.getAdminProfile(req.admin.id);
  }
}
