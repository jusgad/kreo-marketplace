import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoggerService } from '../../../../shared/logging';

/**
 * Servicio de Autenticación
 *
 * Maneja el registro, inicio de sesión, autenticación de dos factores (2FA)
 * y gestión de tokens JWT para usuarios del marketplace.
 *
 * Características de seguridad:
 * - Hash bcrypt con 12 salt rounds
 * - Rotación automática de refresh tokens
 * - Sistema de revocación de tokens (blacklist)
 * - Verificación de email en dos pasos
 * - Autenticación de dos factores (TOTP)
 * - Logging de intentos de inicio de sesión
 */
@Injectable()
export class AuthService {
  private registroDeLogs: LoggerService;

  constructor(
    @InjectRepository(User)
    private repositorioDeUsuarios: Repository<User>,
    private servicioJwt: JwtService,
    private servicioDeBlacklist: TokenBlacklistService,
  ) {
    this.registroDeLogs = new LoggerService('AuthService');
  }

  /**
   * Registra un nuevo usuario en el sistema
   *
   * Este método:
   * 1. Verifica que el email no esté registrado
   * 2. Hashea la contraseña con bcrypt (12 salt rounds para mayor seguridad)
   * 3. Crea el usuario en la base de datos
   * 4. Genera tokens JWT (access + refresh) para inicio de sesión automático
   *
   * @param datosDeRegistro - Información del nuevo usuario (email, contraseña, nombre)
   * @returns Usuario creado (sin datos sensibles) y tokens de autenticación
   * @throws ConflictException si el email ya está registrado
   */
  async register(datosDeRegistro: RegisterDto) {
    const { email, password, role, first_name, last_name } = datosDeRegistro;

    // Verificar si el email ya está registrado en nuestro sistema
    const usuarioExistente = await this.repositorioDeUsuarios.findOne({ where: { email } });
    if (usuarioExistente) {
      this.registroDeLogs.warn('Intento de registro con email duplicado', { email });
      throw new ConflictException('Este email ya está registrado. Por favor, inicia sesión o usa otro email.');
    }

    // Hashear la contraseña usando bcrypt con 12 salt rounds
    // Esto hace que cada contraseña sea única incluso si dos usuarios tienen la misma contraseña
    const contraseniaHasheada = await bcrypt.hash(password, 12);

    // Crear el nuevo usuario con los datos proporcionados
    const nuevoUsuario = this.repositorioDeUsuarios.create({
      email,
      password_hash: contraseniaHasheada,
      role: role || 'customer', // Por defecto, los usuarios son clientes
      first_name,
      last_name,
    });

    // Guardar el usuario en la base de datos
    await this.repositorioDeUsuarios.save(nuevoUsuario);

    // Generar tokens JWT para que el usuario pueda empezar a usar la aplicación inmediatamente
    const tokensDeAutenticacion = await this.generarTokens(nuevoUsuario);

    this.registroDeLogs.info('Usuario registrado exitosamente', {
      userId: nuevoUsuario.id,
      email: nuevoUsuario.email
    });

    // SEGURIDAD: Los tokens se retornan para ser establecidos como cookies HttpOnly
    // en el controlador. No se deben incluir en el body de la respuesta JSON
    return {
      user: this.limpiarDatosDelUsuario(nuevoUsuario),
      accessToken: tokensDeAutenticacion.accessToken,
      refreshToken: tokensDeAutenticacion.refreshToken,
    };
  }

  /**
   * Inicia sesión de un usuario existente
   *
   * Este método realiza múltiples validaciones de seguridad:
   * 1. Verifica que el email existe y la contraseña es correcta
   * 2. Comprueba que la cuenta no esté desactivada o eliminada
   * 3. Valida el estado de verificación del email
   * 4. Maneja el flujo de autenticación de dos factores (2FA) si está habilitada
   * 5. Registra la IP y fecha del último inicio de sesión
   *
   * @param datosDeLogin - Credenciales del usuario (email y contraseña)
   * @param direccionIp - IP desde donde se origina el inicio de sesión (opcional, para auditoría)
   * @returns Usuario autenticado y tokens JWT, o solicitud de 2FA si está habilitada
   * @throws UnauthorizedException si las credenciales son inválidas o la cuenta está desactivada
   */
  async login(datosDeLogin: LoginDto, direccionIp?: string) {
    const { email, password } = datosDeLogin;

    // Buscar el usuario por email, incluyendo datos necesarios para autenticación
    // Nota: Incluimos 'withDeleted: true' para detectar cuentas eliminadas
    const usuario = await this.repositorioDeUsuarios.findOne({
      where: { email },
      select: [
        'id', 'email', 'password_hash', 'role',
        'first_name', 'last_name', 'email_verified',
        'two_factor_enabled', 'deleted_at'
      ],
      withDeleted: true, // Permite encontrar usuarios con soft-delete
    });

    // SEGURIDAD: Si no encontramos el usuario o no tiene contraseña, rechazar el acceso
    // Usamos el mismo mensaje para ambos casos para no revelar si el email existe
    if (!usuario || !usuario.password_hash) {
      this.registroDeLogs.warn('Intento de login con credenciales inválidas', { email, direccionIp });
      throw new UnauthorizedException('Email o contraseña incorrectos. Por favor, verifica tus credenciales.');
    }

    // SEGURIDAD: Verificar si la cuenta está eliminada o desactivada
    if (usuario.deleted_at) {
      this.registroDeLogs.warn('Intento de login en cuenta desactivada', { userId: usuario.id, direccionIp });
      throw new UnauthorizedException('Esta cuenta ha sido desactivada. Contacta a soporte si crees que es un error.');
    }

    // Verificar que la contraseña proporcionada coincide con el hash almacenado
    const contraseniaEsValida = await bcrypt.compare(password, usuario.password_hash);
    if (!contraseniaEsValida) {
      // TODO: Implementar contador de intentos fallidos para prevenir ataques de fuerza bruta
      this.registroDeLogs.warn('Intento de login con contraseña incorrecta', { email, direccionIp });
      throw new UnauthorizedException('Email o contraseña incorrectos. Por favor, verifica tus credenciales.');
    }

    // SEGURIDAD: Verificar estado de verificación del email
    // Permitimos el login pero con acceso limitado si el email no está verificado
    if (!usuario.email_verified) {
      // Permitir acceso parcial - el usuario puede verificar su email pero no realizar operaciones críticas
      const tokensDeAccesoParcial = await this.generarTokens(usuario);

      return {
        user: this.limpiarDatosDelUsuario(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        requires_email_verification: true,
        message: 'Please verify your email to access all features',
      };
    }

    // Update last login
    user.last_login_at = new Date();
    user.last_login_ip = ip;
    await this.repositorioDeUsuarios.save(user);

    // If 2FA enabled, return intermediate response
    if (user.two_factor_enabled) {
      return {
        requires_2fa: true,
        user_id: user.id,
        message: 'Please enter your 2FA code',
      };
    }

    // Generate tokens
    const tokens = await this.generarTokens(user);

    return {
      user: this.limpiarDatosDelUsuario(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.repositorioDeUsuarios.findOne({
      where: { email },
      select: ['id', 'email', 'password_hash', 'role'],
    });

    if (user && user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        const { password_hash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.servicioJwt.verifyAsync(token);
      const user = await this.repositorioDeUsuarios.findOne({ where: { id: payload.sub } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.limpiarDatosDelUsuario(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * ✅ CRÍTICO #6 SOLUCIONADO: Revocación de tokens con rotation
   */
  async refreshToken(refreshToken: string, metadata?: { ipAddress?: string; userAgent?: string }) {
    try {
      // Verificar si el token está en la blacklist
      const isRevoked = await this.servicioDeBlacklist.isTokenRevoked(refreshToken);
      if (isRevoked) {
        this.registroDeLogs.warn('Attempted use of revoked refresh token');
        throw new UnauthorizedException('Token has been revoked');
      }

      const payload = await this.servicioJwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      const user = await this.repositorioDeUsuarios.findOne({ where: { id: payload.sub } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // ROTATION: Revocar el refresh token viejo antes de emitir uno nuevo
      await this.servicioDeBlacklist.revokeToken(
        refreshToken,
        user.id,
        'token_refresh',
        metadata
      );

      this.registroDeLogs.info('Refresh token rotated successfully', { userId: user.id });

      return this.generarTokens(user);
    } catch (error) {
      this.registroDeLogs.error('Refresh token error', error as Error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user by revoking tokens
   *
   * ✅ CRÍTICO #6 SOLUCIONADO: Endpoint de logout con revocación
   */
  async logout(
    accessToken: string,
    refreshToken: string,
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      // Revocar access token
      await this.servicioDeBlacklist.revokeToken(
        accessToken,
        userId,
        'logout',
        metadata
      );

      // Revocar refresh token
      if (refreshToken) {
        await this.servicioDeBlacklist.revokeToken(
          refreshToken,
          userId,
          'logout',
          metadata
        );
      }

      this.registroDeLogs.info('User logged out successfully', { userId });
    } catch (error) {
      this.registroDeLogs.error('Logout error', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Revoca todos los tokens de un usuario
   * Útil cuando se cambia la contraseña o hay una brecha de seguridad
   *
   * ✅ CRÍTICO #6 SOLUCIONADO: Revocación masiva de sesiones
   */
  async revokeAllSessions(userId: string, reason: 'password_change' | 'security_breach' | 'manual'): Promise<void> {
    try {
      await this.servicioDeBlacklist.revokeAllUserTokens(userId, reason);
      this.registroDeLogs.info('All user sessions revoked', { userId, reason });
    } catch (error) {
      this.registroDeLogs.error('Error revoking all sessions', error as Error, { userId });
      throw error;
    }
  }

  async enable2FA(userId: string) {
    const user = await this.repositorioDeUsuarios.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = speakeasy.generateSecret({ length: 32 });

    user.two_factor_secret = secret.base32;
    await this.repositorioDeUsuarios.save(user);

    return {
      secret: secret.base32,
      qr_code_url: secret.otpauth_url,
    };
  }

  async verify2FA(userId: string, token: string) {
    const user = await this.repositorioDeUsuarios.findOne({ where: { id: userId } });
    if (!user || !user.two_factor_secret) {
      throw new BadRequestException('2FA not set up');
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    user.two_factor_enabled = true;
    await this.repositorioDeUsuarios.save(user);

    return { success: true };
  }

  /**
   * Genera un par de tokens JWT (access + refresh) para un usuario
   *
   * Los tokens incluyen información básica del usuario en su payload:
   * - ID del usuario (como 'sub' según estándar JWT)
   * - Email
   * - Rol (customer, vendor, admin)
   *
   * El access token tiene una vida corta (15 minutos) para minimizar riesgo de uso no autorizado.
   * El refresh token tiene una vida más larga (7 días) para permitir renovación sin requerir login.
   *
   * @param usuario - Usuario para el cual generar los tokens
   * @returns Par de tokens: accessToken (corta duración) y refreshToken (larga duración)
   */
  private async generarTokens(usuario: User) {
    // Preparar la información que irá dentro del token (payload)
    const informacionDelToken = {
      sub: usuario.id,      // 'sub' (subject) es el estándar JWT para el ID del usuario
      email: usuario.email,
      role: usuario.role    // Útil para verificar permisos sin consultar la base de datos
    };

    // Token de acceso: vida corta (15 minutos recomendado)
    // Se usa en cada petición al API para autenticar al usuario
    const tokenDeAcceso = await this.servicioJwt.signAsync(informacionDelToken, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    // Token de renovación: vida larga (7 días recomendado)
    // Permite obtener un nuevo access token sin pedir credenciales de nuevo
    const tokenDeRenovacion = await this.servicioJwt.signAsync(informacionDelToken, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return {
      accessToken: tokenDeAcceso,
      refreshToken: tokenDeRenovacion,
    };
  }

  /**
   * Limpia los datos del usuario eliminando información sensible
   *
   * Este método es crucial para la seguridad: nunca debemos enviar
   * al cliente información como:
   * - Contraseñas hasheadas
   * - Secretos de 2FA
   * - Otros datos internos
   *
   * @param usuario - Usuario con todos sus datos
   * @returns Usuario sin información sensible
   */
  private limpiarDatosDelUsuario(usuario: User) {
    // Destructuring para separar datos sensibles del resto
    const { password_hash, two_factor_secret, ...datosLimpios } = usuario;
    return datosLimpios;
  }
}
