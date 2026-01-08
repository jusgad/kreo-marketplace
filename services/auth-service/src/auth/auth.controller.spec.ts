import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserFactory, DtoFactory } from '../../test/utils/factories';
import { TestHelpers } from '../../test/utils/test-helpers';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    verifyToken: jest.fn(),
    enable2FA: jest.fn(),
    verify2FA: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and set cookies', async () => {
      const registerDto = DtoFactory.createRegisterDto();
      const user = UserFactory.createUser({ email: registerDto.email });
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.register.mockResolvedValue({
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await controller.register(registerDto, mockResponse);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message', 'Registro exitoso');
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2); // access_token and refresh_token cookies
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle registration errors', async () => {
      const registerDto = DtoFactory.createRegisterDto();
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.register.mockRejectedValue(new Error('Registration failed'));

      await expect(controller.register(registerDto, mockResponse)).rejects.toThrow('Registration failed');
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user and set cookies', async () => {
      const loginDto = DtoFactory.createLoginDto();
      const user = UserFactory.createUser({ email: loginDto.email });
      const mockRequest = TestHelpers.createMockRequest({ ip: '127.0.0.1' });
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.login.mockResolvedValue({
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await controller.login(loginDto, mockRequest, mockResponse);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message', 'Login exitoso');
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1');
    });

    it('should handle login with 2FA required', async () => {
      const loginDto = DtoFactory.createLoginDto();
      const mockRequest = TestHelpers.createMockRequest();
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.login.mockResolvedValue({
        requires_2fa: true,
        user_id: 'user-id',
        message: 'Please enter your 2FA code',
      });

      const result = await controller.login(loginDto, mockRequest, mockResponse);

      expect(result).toHaveProperty('requires_2fa', true);
      expect(mockResponse.cookie).not.toHaveBeenCalled(); // No cookies set when 2FA required
    });

    it('should handle login errors', async () => {
      const loginDto = DtoFactory.createLoginDto();
      const mockRequest = TestHelpers.createMockRequest();
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto, mockRequest, mockResponse)).rejects.toThrow(UnauthorizedException);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const mockRequest = TestHelpers.createMockRequest({
        cookies: { refresh_token: 'valid-refresh-token' },
      });
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(result).toHaveProperty('message', 'Token actualizado');
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should handle missing refresh token', async () => {
      const mockRequest = TestHelpers.createMockRequest({ cookies: {} });
      const mockResponse = TestHelpers.createMockResponse();

      mockAuthService.refreshToken.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.refresh(mockRequest, mockResponse)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user and clear cookies', async () => {
      const mockResponse = TestHelpers.createMockResponse();

      const result = await controller.logout(mockResponse);

      expect(result).toHaveProperty('message', 'Logout exitoso');
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = UserFactory.createUser();
      const mockRequest = TestHelpers.createMockRequest({ user });

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(user);
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA for authenticated user', async () => {
      const user = UserFactory.createUser();
      const mockRequest = TestHelpers.createMockRequest({ user: { id: user.id } });

      mockAuthService.enable2FA.mockResolvedValue({
        secret: 'secret-key',
        qr_code_url: 'otpauth://...',
      });

      const result = await controller.enable2FA(mockRequest);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qr_code_url');
      expect(mockAuthService.enable2FA).toHaveBeenCalledWith(user.id);
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA token', async () => {
      const user = UserFactory.createUser();
      const mockRequest = TestHelpers.createMockRequest({ user: { id: user.id } });
      const verify2FADto = { token: '123456' };

      mockAuthService.verify2FA.mockResolvedValue({ success: true });

      const result = await controller.verify2FA(mockRequest, verify2FADto);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.verify2FA).toHaveBeenCalledWith(user.id, verify2FADto.token);
    });

    it('should handle invalid 2FA token', async () => {
      const user = UserFactory.createUser();
      const mockRequest = TestHelpers.createMockRequest({ user: { id: user.id } });
      const verify2FADto = { token: '000000' };

      mockAuthService.verify2FA.mockRejectedValue(new UnauthorizedException('Invalid 2FA token'));

      await expect(controller.verify2FA(mockRequest, verify2FADto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const user = UserFactory.createUser();

      mockAuthService.verifyToken.mockResolvedValue(user);

      const result = await controller.verifyToken('valid-token');

      expect(result).toEqual(user);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return invalid for empty token', async () => {
      const result = await controller.verifyToken('');

      expect(result).toEqual({ valid: false });
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should return invalid for non-string token', async () => {
      const result = await controller.verifyToken(null as any);

      expect(result).toEqual({ valid: false });
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should handle invalid token', async () => {
      mockAuthService.verifyToken.mockRejectedValue(new UnauthorizedException('Invalid token'));

      await expect(controller.verifyToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
