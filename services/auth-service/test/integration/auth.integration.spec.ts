import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DtoFactory } from '../utils/factories';

describe('Auth Integration Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and set cookies', () => {
      const registerDto = DtoFactory.createRegisterDto();

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', registerDto.email);
          expect(res.body).not.toHaveProperty('accessToken');
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    it('should reject duplicate email registration', async () => {
      const registerDto = DtoFactory.createRegisterDto({ email: 'duplicate@example.com' });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('should validate email format', () => {
      const invalidDto = DtoFactory.createRegisterDto({ email: 'invalid-email' });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate password strength', () => {
      const weakPasswordDto = DtoFactory.createRegisterDto({ password: '123' });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const testUser = {
      email: 'test-login@example.com',
      password: 'SecurePassword123!',
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(DtoFactory.createRegisterDto(testUser));
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword' })
        .expect(401);
    });

    it('should enforce rate limiting on login attempts', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const results = await Promise.all(requests);
      const rateLimited = results.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('should get user profile with valid token', async () => {
      const registerDto = DtoFactory.createRegisterDto();

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      const cookies = registerRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', registerDto.email);
        });
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and clear cookies', async () => {
      const registerDto = DtoFactory.createRegisterDto();

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      const cookies = registerRes.headers['set-cookie'];

      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Logout exitoso');
        });
    });
  });
});
