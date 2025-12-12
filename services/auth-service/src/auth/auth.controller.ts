<<<<<<< HEAD
// ==============================================================================
// ARCHIVO: services/auth-service/src/auth/auth.controller.ts
// FUNCIONALIDAD: Controlador de autenticación y autorización
// - Endpoints de registro, login, logout, refresh token
// - Implementa rate limiting para prevenir ataques de fuerza bruta
// - Usa cookies HTTP-Only y Secure para almacenar tokens JWT
// - Soporta autenticación de dos factores (2FA)
// - Protege rutas con guards (JWT, rate limiting)
// ==============================================================================

=======
>>>>>>> c731df26401408171e200c4d85d5708ac1e76637
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

  // ===========================================================================
  // ENDPOINT: POST /auth/register
  // Registra nuevos usuarios en la plataforma
  // - Rate limited: 3 registros por hora por IP (previene spam)
  // - Sanitiza datos de entrada con RegisterDto
  // ===========================================================================
  @Post('register')
  @UseGuards(RateLimitGuard)
<<<<<<< HEAD
  @RegisterRateLimit()  // ✅ 3 registros por hora por IP
=======
  @RegisterRateLimit() // ✅ 3 registros por hora por IP
>>>>>>> c731df26401408171e200c4d85d5708ac1e76637
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // ===========================================================================
  // ENDPOINT: POST /auth/login
  // Autentica usuarios y emite tokens JWT
  // - Rate limited: 5 intentos por minuto por IP (previene fuerza bruta)
  // - Almacena tokens en cookies HTTP-Only (más seguro que localStorage)
  // - NO devuelve tokens en el body de la respuesta
  // ===========================================================================
  @Post('login')
  @UseGuards(RateLimitGuard)
<<<<<<< HEAD
  @LoginRateLimit()  // ✅ 5 intentos de login por minuto
=======
  @LoginRateLimit() // ✅ 5 intentos de login por minuto
>>>>>>> c731df26401408171e200c4d85d5708ac1e76637
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const result = await this.authService.login(loginDto, ip);

    // ✅ Establecer tokens en cookies HTTP-Only y Secure
<<<<<<< HEAD
    // Previene acceso desde JavaScript (protección contra XSS)
=======
>>>>>>> c731df26401408171e200c4d85d5708ac1e76637
    SecureSession.setAccessTokenCookie(res, result.accessToken);
    SecureSession.setRefreshTokenCookie(res, result.refreshToken);

    // NO devolver tokens en el body (solo info del usuario)
    return {
      user: result.user,
      message: 'Login exitoso',
    };
  }

  // ===========================================================================
  // ENDPOINT: POST /auth/refresh
  // Renueva access token usando refresh token
  // - Lee refresh token desde cookie HTTP-Only
  // - Emite nuevo access token con vida corta
  // ===========================================================================
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
<<<<<<< HEAD
=======
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // ✅ Limpiar cookies de sesión
    SecureSession.clearSessionCookies(res);
    return { message: 'Logout exitoso' };
>>>>>>> c731df26401408171e200c4d85d5708ac1e76637
  }

  // ===========================================================================
  // ENDPOINT: POST /auth/logout
  // Cierra sesión del usuario
  // - Requiere autenticación (JwtAuthGuard)
  // - Limpia cookies de sesión
  // ===========================================================================
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // ✅ Limpiar cookies de sesión
    SecureSession.clearSessionCookies(res);
    return { message: 'Logout exitoso' };
  }

  // ===========================================================================
  // ENDPOINT: GET /auth/me
  // Obtiene perfil del usuario autenticado
  // - Requiere autenticación (JwtAuthGuard)
  // ===========================================================================
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  // ===========================================================================
  // ENDPOINTS DE AUTENTICACIÓN DE DOS FACTORES (2FA)
  // ===========================================================================

  // Habilita 2FA para el usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enable2FA(@Request() req) {
    return this.authService.enable2FA(req.user.id);
  }

  // Verifica código 2FA del usuario
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async verify2FA(@Request() req, @Body('token') token: string) {
    return this.authService.verify2FA(req.user.id, token);
  }

  // Verifica validez de un token JWT
  @Post('verify-token')
  async verifyToken(@Body('token') token: string) {
    return this.authService.verifyToken(token);
  }
}
