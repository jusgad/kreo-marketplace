import { Repository } from 'typeorm';

export const mockRepository = <T = any>(): Partial<Repository<T>> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto as T),
  update: jest.fn(),
  delete: jest.fn(),
  softRemove: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  })),
});

export const mockElasticsearchClient = {
  indices: {
    exists: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue({ acknowledged: true }),
    refresh: jest.fn().mockResolvedValue({ acknowledged: true }),
  },
  index: jest.fn().mockResolvedValue({ _id: 'doc-id', result: 'created' }),
  search: jest.fn().mockResolvedValue({
    hits: {
      hits: [],
      total: { value: 0 },
    },
    aggregations: {
      categories: { buckets: [] },
      price_ranges: { buckets: [] },
    },
  }),
  delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
};

export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      ELASTICSEARCH_URL: 'http://localhost:9200',
      AWS_REGION: 'us-east-1',
      AWS_S3_BUCKET: 'test-bucket',
    };
    return config[key] || null;
  }),
};
