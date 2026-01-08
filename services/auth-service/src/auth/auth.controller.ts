// ==============================================================================
// ARCHIVO: services/auth-service/src/auth/auth.controller.ts
// FUNCIONALIDAD: Controlador de autenticación y autorización
// - Endpoints de registro, login, logout, refresh token
// - Implementa rate limiting para prevenir ataques de fuerza bruta
// - Usa cookies HTTP-Only y Secure para almacenar tokens JWT
// - Soporta autenticación de dos factores (2FA)
// - Protege rutas con guards (JWT, rate limiting)
// ==============================================================================

import { Controller, Post, Body, UseGuards, Request, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
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
  @RegisterRateLimit()  // ✅ 3 registros por hora por IP
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(registerDto);

    // ✅ SECURITY FIX: Set tokens in HTTP-Only cookies, NOT in response body
    SecureSession.setAccessTokenCookie(res, result.accessToken);
    SecureSession.setRefreshTokenCookie(res, result.refreshToken);

    // Return only user info, NOT tokens
    return {
      user: result.user,
      message: 'Registro exitoso',
    };
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
  @LoginRateLimit()  // ✅ 5 intentos de login por minuto
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip = req.ip || req.connection.remoteAddress;
    const result = await this.authService.login(loginDto, ip);

    // ✅ Establecer tokens en cookies HTTP-Only y Secure
    // Previene acceso desde JavaScript (protección contra XSS)
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
  // ✅ CRÍTICO #6: Implementa token rotation con revocación
  // ===========================================================================
  @Post('refresh')
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    const metadata = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.refreshToken(refreshToken, metadata);

    // ✅ Actualizar access token en cookie
    SecureSession.setAccessTokenCookie(res, result.accessToken);
    SecureSession.setRefreshTokenCookie(res, result.refreshToken);

    return { message: 'Token actualizado' };
  }

  // ===========================================================================
  // ENDPOINT: POST /auth/logout
  // Cierra sesión del usuario y revoca sus tokens
  // - Requiere autenticación (JwtAuthGuard)
  // - Revoca access token y refresh token
  // - Limpia cookies
  // ✅ CRÍTICO #6 SOLUCIONADO: Endpoint de logout con revocación de tokens
  // ===========================================================================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const accessToken = req.cookies?.access_token ||
      req.headers.authorization?.replace('Bearer ', '');
    const refreshToken = req.cookies?.refresh_token;
    const userId = req.user.id;

    const metadata = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    await this.authService.logout(accessToken, refreshToken, userId, metadata);

    // Limpiar cookies
    SecureSession.clearTokenCookies(res);

    return { message: 'Logout exitoso' };
  }

  // ===========================================================================
  // ENDPOINT: POST /auth/revoke-all-sessions
  // Revoca todas las sesiones activas del usuario
  // - Útil cuando se cambia la contraseña o hay una brecha de seguridad
  // - Requiere autenticación (JwtAuthGuard)
  // ✅ CRÍTICO #6 SOLUCIONADO: Revocación masiva de sesiones
  // ===========================================================================
  @Post('revoke-all-sessions')
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(
    @Request() req,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = req.user.id;

    await this.authService.revokeAllSessions(userId, 'manual');

    // Limpiar cookies de la sesión actual
    SecureSession.clearTokenCookies(res);

    return { message: 'Todas las sesiones han sido revocadas' };
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
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @LoginRateLimit() // Rate limit 2FA verification to prevent brute force
  @Post('2fa/verify')
  async verify2FA(@Request() req, @Body() verify2FADto: Verify2FADto) {
    return this.authService.verify2FA(req.user.id, verify2FADto.token);
  }

  // Verifica validez de un token JWT
  @Post('verify-token')
  async verifyToken(@Body('token') token: string) {
    if (!token || typeof token !== 'string') {
      return { valid: false };
    }
    return this.authService.verifyToken(token);
  }
}
