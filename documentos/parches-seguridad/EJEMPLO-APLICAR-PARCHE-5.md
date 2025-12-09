# Ejemplo: Cómo Aplicar el Parche #5 - Rate Limiting y Cookies Seguras

## Parte A: Implementar Rate Limiting en Login

### ❌ CÓDIGO INSEGURO (ACTUAL):
```typescript
// auth.controller.ts
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ⚠️ VULNERABILIDAD: Sin rate limiting, permite fuerza bruta
  return this.authService.login(loginDto);
}
```

Un atacante podría intentar miles de combinaciones:
```bash
# Ataque de fuerza bruta
for password in $(cat passwords.txt); do
  curl -X POST /auth/login \
    -d "{\"email\":\"victim@example.com\", \"password\":\"$password\"}"
done
```

### ✅ SOLUCIÓN 1: Usar Guard de Rate Limiting

```typescript
// auth.controller.ts
import { LoginRateLimit } from '@kreo/shared/security/rate-limiter';
import { RateLimitGuard } from '@kreo/shared/security/rate-limiter';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(RateLimitGuard) // Aplicar el guard
  @LoginRateLimit() // 5 intentos por minuto
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);

    // Si el login es exitoso, resetear contador de intentos fallidos
    // (ver solución 2 para implementación completa)

    return res.json(result);
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RegisterRateLimit() // 3 registros por hora
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @PasswordResetRateLimit() // 3 intentos por hora
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.sendPasswordResetEmail(body.email);
  }
}
```

### ✅ SOLUCIÓN 2: Rate Limiting + Bloqueo por Intentos Fallidos

```typescript
// auth.service.ts
import { RateLimiter } from '@kreo/shared/security/rate-limiter';
import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private rateLimiter: RateLimiter;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {
    this.rateLimiter = new RateLimiter();
  }

  async login(loginDto: LoginDto, ip: string) {
    const { email, password } = loginDto;

    // 1. Verificar si la IP está bloqueada
    const isBlocked = await this.rateLimiter.isIPBlocked(ip);
    if (isBlocked) {
      throw new HttpException(
        'Tu IP ha sido bloqueada temporalmente por múltiples intentos fallidos',
        HttpStatus.FORBIDDEN
      );
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Incrementar intentos fallidos
      await this.handleFailedLogin(email, ip);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Verificar password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Incrementar intentos fallidos
      await this.handleFailedLogin(email, ip);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 4. Login exitoso - resetear intentos fallidos
    await this.rateLimiter.resetFailedAttempts(email);
    await this.rateLimiter.resetFailedAttempts(ip);

    // 5. Generar tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  private async handleFailedLogin(email: string, ip: string) {
    // Incrementar contador por email
    const emailAttempts = await this.rateLimiter.incrementFailedAttempts(
      email,
      5, // Máximo 5 intentos
      300 // En 5 minutos
    );

    // Incrementar contador por IP
    const ipAttempts = await this.rateLimiter.incrementFailedAttempts(
      ip,
      10, // Máximo 10 intentos por IP
      600 // En 10 minutos
    );

    // Bloquear IP si se excede el límite
    if (ipAttempts.shouldBlock) {
      await this.rateLimiter.blockIP(ip, 3600); // Bloquear por 1 hora
      console.error(`IP bloqueada por intentos fallidos: ${ip}`);

      // Enviar alerta al equipo de seguridad
      await this.sendSecurityAlert('IP_BLOCKED', { ip, attempts: ipAttempts.attempts });
    }

    // Alerta si se excede el límite por email
    if (emailAttempts.shouldBlock) {
      console.warn(`Múltiples intentos fallidos para email: ${email}`);

      // Enviar email al usuario sobre intentos sospechosos
      await this.sendSuspiciousActivityEmail(email);
    }
  }
}
```

## Parte B: Configurar Cookies Seguras

### ✅ SOLUCIÓN: Usar Cookies HTTP-Only y Secure

```typescript
// auth.service.ts
import { SecureSession } from '@kreo/shared/security/secure-session';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async generateTokens(user: User) {
    // Payload del JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      // Agregar versión de token para poder invalidar todos los tokens del usuario
      tokenVersion: await TokenValidator.getTokenVersion(user.id, redisClient),
    };

    // Generar access token (15 minutos)
    const accessToken = this.jwtService.sign(payload, {
      secret: SecureSession.JWT_CONFIG.accessToken.secret,
      expiresIn: SecureSession.JWT_CONFIG.accessToken.expiresIn,
    });

    // Generar refresh token (7 días)
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: SecureSession.JWT_CONFIG.refreshToken.secret,
        expiresIn: SecureSession.JWT_CONFIG.refreshToken.expiresIn,
      }
    );

    return { accessToken, refreshToken };
  }
}

// auth.controller.ts
import { Response } from 'express';
import { SecureSession } from '@kreo/shared/security/secure-session';

@Post('login')
@UseGuards(RateLimitGuard)
@LoginRateLimit()
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

  // Devolver solo información del usuario (NO los tokens)
  return {
    user: result.user,
    message: 'Login exitoso',
  };
}

@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
  const token = req.cookies.access_token;

  // Agregar token a lista negra
  if (token) {
    await TokenValidator.blacklistToken(
      token,
      15 * 60, // 15 minutos (tiempo de vida del access token)
      redisClient
    );
  }

  // ✅ Limpiar cookies
  SecureSession.clearSessionCookies(res);

  return { message: 'Logout exitoso' };
}

@Post('refresh')
async refreshToken(
  @Req() req,
  @Res({ passthrough: true }) res: Response
) {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token no encontrado');
  }

  // Verificar refresh token
  try {
    const payload = this.jwtService.verify(refreshToken, {
      secret: SecureSession.JWT_CONFIG.refreshToken.secret,
    });

    // Generar nuevo access token
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const tokens = await this.authService.generateTokens(user);

    // ✅ Actualizar access token en cookie
    SecureSession.setAccessTokenCookie(res, tokens.accessToken);

    return { message: 'Token actualizado' };
  } catch (error) {
    throw new UnauthorizedException('Refresh token inválido');
  }
}
```

### ✅ Modificar JWT Strategy para Leer Cookies

```typescript
// jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SecureSession, TokenValidator } from '@kreo/shared/security/secure-session';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      // ✅ Extraer JWT de la cookie en lugar del header Authorization
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: SecureSession.JWT_CONFIG.accessToken.secret,
      passReqToCallback: true, // Para acceder al request en validate()
    });
  }

  async validate(request: any, payload: any) {
    // Verificar que el token no esté en lista negra
    const token = request.cookies.access_token;
    if (await TokenValidator.isTokenBlacklisted(token, redisClient)) {
      throw new UnauthorizedException('Token inválido');
    }

    // Verificar versión del token
    const currentVersion = await TokenValidator.getTokenVersion(payload.sub, redisClient);
    if (payload.tokenVersion !== currentVersion) {
      throw new UnauthorizedException('Token expirado. Por favor inicia sesión nuevamente.');
    }

    // Buscar usuario
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
```

## Parte C: Configurar Seguridad Global en main.ts

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { SecureCORS, SecurityHeaders } from '@kreo/shared/security/secure-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ✅ Habilitar CORS seguro
  const corsOptions = process.env.NODE_ENV === 'production'
    ? SecureCORS.getProductionCORSOptions()
    : SecureCORS.getDevelopmentCORSOptions();

  app.enableCors(corsOptions);

  // 2. ✅ Configurar helmet para headers de seguridad
  app.use(helmet(SecurityHeaders.getHelmetOptions()));

  // 3. ✅ Habilitar cookie parser
  app.use(cookieParser());

  // 4. ✅ Configurar ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // 5. ✅ Configurar prefijo de API
  app.setGlobalPrefix('api');

  // 6. ✅ Deshabilitar X-Powered-By header
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  await app.listen(3000);
  console.log(`🚀 Aplicación ejecutándose en: ${await app.getUrl()}`);
}
bootstrap();
```

## Parte D: Configurar Variables de Entorno

```bash
# .env
NODE_ENV=production

# JWT Secrets (generar con: openssl rand -base64 32)
JWT_ACCESS_SECRET=tu-secreto-super-seguro-para-access-token-aqui
JWT_REFRESH_SECRET=tu-secreto-super-seguro-para-refresh-token-aqui

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu-password-redis

# Session
SESSION_SECRET=tu-secreto-super-seguro-para-sesiones

# CORS
ALLOWED_ORIGINS=https://tuapp.com,https://www.tuapp.com

# Rate Limiting
ENABLE_RATE_LIMITING=true
```

## Ejemplo: Invalidar Todos los Tokens de un Usuario

Útil cuando un usuario cambia su password o detecta actividad sospechosa:

```typescript
// auth.service.ts
async changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await this.userRepository.findOne({ where: { id: userId } });

  // Verificar password actual
  const isValid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValid) {
    throw new BadRequestException('Password actual incorrecto');
  }

  // Actualizar password
  user.password_hash = await bcrypt.hash(newPassword, 10);
  await this.userRepository.save(user);

  // ✅ Invalidar TODOS los tokens existentes del usuario
  await TokenValidator.invalidateAllUserTokens(userId, redisClient);

  console.log(`Todos los tokens del usuario ${userId} han sido invalidados`);

  return { message: 'Password actualizado. Por favor inicia sesión nuevamente.' };
}
```

## Checklist de Seguridad de Autenticación

- ✅ **Rate limiting en /login** (5 intentos por minuto)
- ✅ **Rate limiting en /register** (3 registros por hora)
- ✅ **Rate limiting en /forgot-password** (3 intentos por hora)
- ✅ **Bloqueo de IP** después de múltiples intentos fallidos
- ✅ **Cookies HttpOnly** para tokens JWT
- ✅ **Cookies Secure** (solo HTTPS en producción)
- ✅ **SameSite=strict** para prevenir CSRF
- ✅ **Access token de corta duración** (15 minutos)
- ✅ **Refresh token de larga duración** (7 días)
- ✅ **Lista negra de tokens** en Redis
- ✅ **Invalidación de tokens** al cambiar password
- ✅ **Headers de seguridad** con helmet
- ✅ **CORS configurado correctamente**
- ✅ **Secrets fuertes** en variables de entorno

## Regla de Oro

### ❌ NUNCA:
- Almacenar tokens en localStorage (vulnerable a XSS)
- Usar cookies sin HttpOnly
- Permitir intentos ilimitados de login
- Usar el mismo secret para access y refresh tokens
- Exponer tokens en logs o respuestas

### ✅ SIEMPRE:
- Usar cookies HttpOnly y Secure
- Implementar rate limiting
- Usar access tokens de corta duración
- Invalidar tokens al cambiar password
- Monitorear intentos fallidos de login
- Usar secrets fuertes y únicos
