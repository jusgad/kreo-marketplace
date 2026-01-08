import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

/**
 * Mock implementations for testing
 */

export const mockRepository = <T = any>(): Partial<Repository<T>> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto as T),
  update: jest.fn(),
  delete: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  })),
});

export const mockJwtService = (): Partial<JwtService> => ({
  sign: jest.fn((payload) => 'mock-jwt-token'),
  signAsync: jest.fn((payload) => Promise.resolve('mock-jwt-token')),
  verify: jest.fn((token) => ({ sub: 'user-id', email: 'test@example.com', role: 'customer' })),
  verifyAsync: jest.fn((token) => Promise.resolve({ sub: 'user-id', email: 'test@example.com', role: 'customer' })),
  decode: jest.fn((token) => ({ sub: 'user-id', email: 'test@example.com', role: 'customer' })),
});

export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key] || null;
  }),
};

export const mockRequest = {
  user: {
    id: 'user-id',
    email: 'test@example.com',
    role: 'customer',
  },
  ip: '127.0.0.1',
  connection: {
    remoteAddress: '127.0.0.1',
  },
  cookies: {},
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};
