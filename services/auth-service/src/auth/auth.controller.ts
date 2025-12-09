import { Controller, Post, Body, UseGuards, Request, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard, LoginRateLimit, RegisterRateLimit, PasswordResetRateLimit } from '../../../../shared/security/rate-limiter';
import { SecureSession } from '../../../../shared/security/secure-session';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RegisterRateLimit() // ✅ 3 registros por hora por IP
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @LoginRateLimit() // ✅ 5 intentos de login por minuto
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const result = await this.authService.login(loginDto, ip);

    // ✅ Establecer tokens en cookies HTTP-Only y Secure
    SecureSession.setAccessTokenCookie(res, result.accessToken);
    SecureSession.setRefreshTokenCookie(res, result.refreshToken);

    // NO devolver tokens en el body (solo info del usuario)
    return {
      user: result.user,
      message: 'Login exitoso',
    };
  }

  @Post('refresh')
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    const result = await this.authService.refreshToken(refreshToken);

    // ✅ Actualizar access token en cookie
    SecureSession.setAccessTokenCookie(res, result.accessToken);

    return { message: 'Token actualizado' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // ✅ Limpiar cookies de sesión
    SecureSession.clearSessionCookies(res);
    return { message: 'Logout exitoso' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enable2FA(@Request() req) {
    return this.authService.enable2FA(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async verify2FA(@Request() req, @Body('token') token: string) {
    return this.authService.verify2FA(req.user.id, token);
  }

  @Post('verify-token')
  async verifyToken(@Body('token') token: string) {
    return this.authService.verifyToken(token);
  }
}
