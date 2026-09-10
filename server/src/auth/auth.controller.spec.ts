import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockUser = {
    id: 'user-1',
    nickname: 'testuser',
    email: 'test@example.com',
    elo: 1000,
    role: 'user',
    isProfileComplete: true,
  };

  const createMockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      registerUserLocal: jest.fn(),
    };

    usersService = {
      incrementTokenVersion: jest.fn(),
    };

    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should set auth cookie and return user json', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValue({
        access_token: 'valid-jwt',
        user: mockUser,
      });

      const res = createMockResponse();
      await controller.login(res, {
        email: 'test@example.com',
        password: 'password',
      });

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'valid-jwt',
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });
  });

  describe('register', () => {
    it('should set auth cookie and return user json', async () => {
      (authService.registerUserLocal as jest.Mock).mockResolvedValue({
        access_token: 'valid-jwt',
        user: mockUser,
      });

      const res = createMockResponse();
      await controller.register(res, {
        email: 'test@example.com',
        nickname: 'testuser',
        password: 'Password123!',
        acceptTerms: true,
      });

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'valid-jwt',
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });
  });

  describe('logout', () => {
    it('should clear access_token cookie and return 200', () => {
      const res = createMockResponse();

      controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('logoutAll', () => {
    it('should increment tokenVersion in DB, clear cookie, and return 200', async () => {
      const req: any = {
        cookies: { access_token: 'active-token' },
      };
      const res = createMockResponse();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-1' });

      await controller.logoutAll(req, res);

      expect(jwtService.verify).toHaveBeenCalledWith('active-token');
      expect(usersService.incrementTokenVersion).toHaveBeenCalledWith('user-1');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out of all devices successfully',
      });
    });

    it('should still clear cookie even if token verification fails', async () => {
      const req: any = {
        cookies: { access_token: 'expired-token' },
      };
      const res = createMockResponse();
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await controller.logoutAll(req, res);

      expect(usersService.incrementTokenVersion).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
