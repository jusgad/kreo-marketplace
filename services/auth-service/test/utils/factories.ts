import { faker } from '@faker-js/faker';
import { User } from '../../src/entities/user.entity';
import { RegisterDto } from '../../src/auth/dto/register.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';

/**
 * Factory functions for generating test data
 */

export class UserFactory {
  static createUser(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = faker.string.uuid();
    user.email = faker.internet.email();
    user.password_hash = '$2b$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Fake bcrypt hash
    user.role = 'customer';
    user.first_name = faker.person.firstName();
    user.last_name = faker.person.lastName();
    user.email_verified = true;
    user.two_factor_enabled = false;
    user.two_factor_secret = null;
    user.last_login_at = null;
    user.last_login_ip = null;
    user.deleted_at = null;
    user.created_at = new Date();
    user.updated_at = new Date();

    return Object.assign(user, overrides);
  }

  static createVendor(overrides: Partial<User> = {}): User {
    return this.createUser({
      role: 'vendor',
      ...overrides,
    });
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.createUser({
      role: 'admin',
      ...overrides,
    });
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }
}

export class DtoFactory {
  static createRegisterDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
    const dto = new RegisterDto();
    dto.email = faker.internet.email();
    dto.password = 'SecurePassword123!';
    dto.first_name = faker.person.firstName();
    dto.last_name = faker.person.lastName();
    dto.role = 'customer';

    return Object.assign(dto, overrides);
  }

  static createLoginDto(overrides: Partial<LoginDto> = {}): LoginDto {
    const dto = new LoginDto();
    dto.email = faker.internet.email();
    dto.password = 'SecurePassword123!';

    return Object.assign(dto, overrides);
  }
}

export class TokenFactory {
  static createJwtPayload(userId: string, email: string, role: string = 'customer') {
    return {
      sub: userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };
  }

  static createAccessToken(): string {
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(this.createJwtPayload(faker.string.uuid(), faker.internet.email()))).toString('base64')}.signature`;
  }

  static createRefreshToken(): string {
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ ...this.createJwtPayload(faker.string.uuid(), faker.internet.email()), exp: Math.floor(Date.now() / 1000) + 604800 })).toString('base64')}.signature`;
  }
}
