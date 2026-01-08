import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { User } from '../../entities/user.entity';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      // SECURITY FIX: Extract JWT from both cookies and Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Try to extract from cookie first (HTTP-Only, more secure)
        (request: Request) => {
          return request?.cookies?.access_token;
        },
        // Fallback to Authorization header for API clients
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      // ✅ CRÍTICO #6: Pasar request al validate para verificar blacklist
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    // Validate payload structure
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // ✅ CRÍTICO #6 SOLUCIONADO: Verificar si el token está en la blacklist
    // Extraer el token del request
    const token = request.cookies?.access_token ||
      request.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const isRevoked = await this.tokenBlacklistService.isTokenRevoked(token);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'role', 'email_verified', 'deleted_at'],
      withDeleted: true, // Include soft-deleted records to check
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user account is deleted (soft delete)
    if (user.deleted_at) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
    };
  }
}
