// ==============================================================================
// ARCHIVO: services/auth-service/src/auth/auth.service.spec.ts
// FUNCIONALIDAD: Unit tests para AuthService
//
// ✅ TESTING: Tests de autenticación, tokens y 2FA
//
// TESTS INCLUIDOS:
// - Registro de usuarios
// - Login con verificación de email
// - Refresh token con rotación
// - Logout con revocación de tokens
// - 2FA (habilitación y verificación)
// - Revocación masiva de sesiones
// ==============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { TokenBlacklistService } from './token-blacklist.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock speakeasy
jest.mock('speakeasy');
const mockedSpeakeasy = speakeasy as jest.Mocked<typeof speakeasy>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let tokenBlacklistService: any;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashedPassword123',
    role: 'customer',
    first_name: 'John',
    last_name: 'Doe',
    email_verified: true,
    two_factor_enabled: false,
    deleted_at: null,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockTokenBlacklistService = {
    revokeToken: jest.fn(),
    isTokenRevoked: jest.fn(),
    revokeAllUserTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    tokenBlacklistService = module.get(TokenBlacklistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'customer',
    };

    beforeEach(() => {
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
    });

    it('should successfully register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.register(registerDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already registered');
    });

    it('should hash password with 12 salt rounds', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await service.register(registerDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });

    it('should generate both access and refresh tokens', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.register(registerDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should not include password_hash in response', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.register(registerDto);

      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('two_factor_secret');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    beforeEach(() => {
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
    });

    it('should successfully login with valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.login(loginDto, '192.168.1.1');

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password_hash);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login for deleted accounts', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        deleted_at: new Date(),
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Account has been deactivated');
    });

    it('should handle unverified email with partial access', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        email_verified: false,
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requires_email_verification', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('accessToken');
    });

    it('should require 2FA when enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        two_factor_enabled: true,
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requires_2fa', true);
      expect(result).toHaveProperty('user_id', mockUser.id);
      expect(result).not.toHaveProperty('accessToken');
    });

    it('should update last login timestamp and IP', async () => {
      const ipAddress = '192.168.1.100';
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await service.login(loginDto, ipAddress);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login_at: expect.any(Date),
          last_login_ip: ipAddress,
        })
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const userId = 'user-123';

    beforeEach(() => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: userId });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTokenBlacklistService.isTokenRevoked.mockResolvedValue(false);
      mockJwtService.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce('new-refresh-token');
    });

    it('should successfully refresh tokens', async () => {
      const result = await service.refreshToken(refreshToken);

      expect(mockTokenBlacklistService.isTokenRevoked).toHaveBeenCalledWith(refreshToken);
      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('should reject revoked refresh tokens', async () => {
      mockTokenBlacklistService.isTokenRevoked.mockResolvedValue(true);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Token has been revoked');
    });

    it('should revoke old refresh token (token rotation)', async () => {
      await service.refreshToken(refreshToken);

      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledWith(
        refreshToken,
        userId,
        'token_refresh',
        undefined
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('User not found');
    });

    it('should handle invalid token gracefully', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should include metadata when refreshing tokens', async () => {
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.refreshToken(refreshToken, metadata);

      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledWith(
        refreshToken,
        userId,
        'token_refresh',
        metadata
      );
    });
  });

  describe('logout', () => {
    const accessToken = 'access-token';
    const refreshToken = 'refresh-token';
    const userId = 'user-123';

    it('should revoke both access and refresh tokens', async () => {
      await service.logout(accessToken, refreshToken, userId);

      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledTimes(2);
      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledWith(
        accessToken,
        userId,
        'logout',
        undefined
      );
      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledWith(
        refreshToken,
        userId,
        'logout',
        undefined
      );
    });

    it('should handle logout with only access token', async () => {
      await service.logout(accessToken, null as any, userId);

      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledTimes(1);
      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledWith(
        accessToken,
        userId,
        'logout',
        undefined
      );
    });

    it('should include metadata when logging out', async () => {
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.logout(accessToken, refreshToken, userId, metadata);

      expect(mockTokenBlacklistService.revokeToken).toHaveBeenCalledWith(
        accessToken,
        userId,
        'logout',
        metadata
      );
    });
  });

  describe('revokeAllSessions', () => {
    const userId = 'user-123';

    it('should revoke all user tokens on password change', async () => {
      await service.revokeAllSessions(userId, 'password_change');

      expect(mockTokenBlacklistService.revokeAllUserTokens).toHaveBeenCalledWith(
        userId,
        'password_change'
      );
    });

    it('should revoke all user tokens on security breach', async () => {
      await service.revokeAllSessions(userId, 'security_breach');

      expect(mockTokenBlacklistService.revokeAllUserTokens).toHaveBeenCalledWith(
        userId,
        'security_breach'
      );
    });

    it('should handle manual revocation', async () => {
      await service.revokeAllSessions(userId, 'manual');

      expect(mockTokenBlacklistService.revokeAllUserTokens).toHaveBeenCalledWith(userId, 'manual');
    });
  });

  describe('2FA (Two-Factor Authentication)', () => {
    describe('enable2FA', () => {
      it('should generate 2FA secret for user', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockedSpeakeasy.generateSecret.mockReturnValue({
          base32: 'SECRET123',
          otpauth_url: 'otpauth://totp/App:test@example.com?secret=SECRET123',
        } as any);

        const result = await service.enable2FA('user-123');

        expect(result).toHaveProperty('secret', 'SECRET123');
        expect(result).toHaveProperty('qr_code_url');
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            two_factor_secret: 'SECRET123',
          })
        );
      });

      it('should throw BadRequestException if user not found', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(service.enable2FA('invalid-id')).rejects.toThrow(BadRequestException);
      });

      it('should use 32 character secret length', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockedSpeakeasy.generateSecret.mockReturnValue({
          base32: 'SECRET123',
          otpauth_url: 'otpauth://url',
        } as any);

        await service.enable2FA('user-123');

        expect(mockedSpeakeasy.generateSecret).toHaveBeenCalledWith({ length: 32 });
      });
    });

    describe('verify2FA', () => {
      it('should verify valid 2FA token', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          ...mockUser,
          two_factor_secret: 'SECRET123',
        });
        mockedSpeakeasy.totp.verify.mockReturnValue(true as any);

        const result = await service.verify2FA('user-123', '123456');

        expect(result).toEqual({ success: true });
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            two_factor_enabled: true,
          })
        );
      });

      it('should reject invalid 2FA token', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          ...mockUser,
          two_factor_secret: 'SECRET123',
        });
        mockedSpeakeasy.totp.verify.mockReturnValue(false as any);

        await expect(service.verify2FA('user-123', '000000')).rejects.toThrow(UnauthorizedException);
        await expect(service.verify2FA('user-123', '000000')).rejects.toThrow('Invalid 2FA token');
      });

      it('should throw BadRequestException if 2FA not set up', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);

        await expect(service.verify2FA('user-123', '123456')).rejects.toThrow(BadRequestException);
        await expect(service.verify2FA('user-123', '123456')).rejects.toThrow('2FA not set up');
      });

      it('should use base32 encoding for TOTP', async () => {
        const secret = 'SECRET123';
        mockUserRepository.findOne.mockResolvedValue({
          ...mockUser,
          two_factor_secret: secret,
        });
        mockedSpeakeasy.totp.verify.mockReturnValue(true as any);

        await service.verify2FA('user-123', '123456');

        expect(mockedSpeakeasy.totp.verify).toHaveBeenCalledWith({
          secret: secret,
          encoding: 'base32',
          token: '123456',
        });
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      const token = 'valid-jwt-token';
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.verifyToken(token);

      expect(result).not.toHaveProperty('password_hash');
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyToken('token')).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyToken('token')).rejects.toThrow('User not found');
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive data in sanitizeUser', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...mockUser,
        password_hash: 'secret-hash',
        two_factor_secret: 'secret-2fa',
      });
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.register({
        email: 'test@example.com',
        password: 'pass',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
      });

      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('two_factor_secret');
    });

    it('should use strong bcrypt salt rounds (12)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12);
    });
  });
});
