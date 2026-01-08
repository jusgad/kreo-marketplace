import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../entities/user.entity';
import { UserFactory } from '../../../test/utils/factories';
import { mockRepository, mockConfigService } from '../../../test/utils/mocks';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository<User>(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate and return user for valid payload', async () => {
      const user = UserFactory.createUser({
        email_verified: true,
        deleted_at: null,
      });

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      userRepository.findOne.mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(result).toHaveProperty('id', user.id);
      expect(result).toHaveProperty('email', user.email);
      expect(result).toHaveProperty('role', user.role);
      expect(result).toHaveProperty('emailVerified', true);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        select: ['id', 'email', 'role', 'email_verified', 'deleted_at'],
        withDeleted: true,
      });
    });

    it('should throw UnauthorizedException if payload is missing', async () => {
      await expect(strategy.validate(null as any)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(null as any)).rejects.toThrow('Invalid token payload');
    });

    it('should throw UnauthorizedException if payload.sub is missing', async () => {
      const payload = {
        email: 'test@example.com',
        role: 'customer',
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Invalid token payload');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = {
        sub: 'non-existent-id',
        email: 'test@example.com',
        role: 'customer',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException if user account is deleted', async () => {
      const user = UserFactory.createUser({
        deleted_at: new Date(),
      });

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      userRepository.findOne.mockResolvedValue(user);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('User account is deactivated');
    });

    it('should return user even if email is not verified', async () => {
      const user = UserFactory.createUser({
        email_verified: false,
        deleted_at: null,
      });

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      userRepository.findOne.mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(result).toHaveProperty('emailVerified', false);
      expect(result).toHaveProperty('id', user.id);
    });

    it('should handle different user roles correctly', async () => {
      const roles = ['customer', 'vendor', 'admin'];

      for (const role of roles) {
        const user = UserFactory.createUser({ role });
        const payload = {
          sub: user.id,
          email: user.email,
          role: user.role,
        };

        userRepository.findOne.mockResolvedValue(user);

        const result = await strategy.validate(payload);

        expect(result).toHaveProperty('role', role);
      }
    });
  });
});
