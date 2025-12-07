import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, role, first_name, last_name } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email,
      password_hash,
      role: role || 'customer',
      first_name,
      last_name,
    });

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, ip?: string) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password_hash', 'role', 'first_name', 'last_name', 'email_verified', 'two_factor_enabled'],
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.last_login_at = new Date();
    user.last_login_ip = ip;
    await this.userRepository.save(user);

    // If 2FA enabled, return intermediate response
    if (user.two_factor_enabled) {
      return {
        requires_2fa: true,
        user_id: user.id,
      };
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
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
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async enable2FA(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = speakeasy.generateSecret({ length: 32 });

    user.two_factor_secret = secret.base32;
    await this.userRepository.save(user);

    return {
      secret: secret.base32,
      qr_code_url: secret.otpauth_url,
    };
  }

  async verify2FA(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    await this.userRepository.save(user);

    return { success: true };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token = await this.jwtService.signAsync(payload);

    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });

    return {
      access_token,
      refresh_token,
    };
  }

  private sanitizeUser(user: User) {
    const { password_hash, two_factor_secret, ...sanitized } = user;
    return sanitized;
  }
}
