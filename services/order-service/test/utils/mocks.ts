import { Repository } from 'typeorm';

export const mockRepository = <T = any>(): Partial<Repository<T>> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto as T) as any,
  update: jest.fn(),
  delete: jest.fn(),
  softRemove: jest.fn(),
  manager: {
    connection: {
      createQueryRunner: jest.fn(() => mockQueryRunner()),
    },
  } as any,
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  })) as any,
});

export const mockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn((entity, data) => ({ ...data, id: 'new-id' })),
    save: jest.fn((data) => Promise.resolve(data)),
    findOne: jest.fn(),
  },
});

export const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      PRODUCT_SERVICE_URL: 'http://localhost:3002',
      PAYMENT_SERVICE_URL: 'http://localhost:3004',
      PLATFORM_COMMISSION_RATE: '10.0',
    };
    return config[key] || null;
  }),
};
