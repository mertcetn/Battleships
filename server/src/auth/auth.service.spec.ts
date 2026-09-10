import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockUser = {
    id: 'user-1',
    nickname: 'testuser',
    email: 'test@example.com',
    elo: 1000,
    role: 'user',
    isProfileComplete: true,
    tokenVersion: 2,
  };

  beforeEach(async () => {
    usersService = {
      validateCredentials: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException if credentials invalid', async () => {
      (usersService.validateCredentials as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token and user on valid credentials', async () => {
      (usersService.validateCredentials as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(usersService.validateCredentials).toHaveBeenCalledWith(
        'test@example.com',
        'correctpassword',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        nickname: 'testuser',
        role: 'user',
        isProfileComplete: true,
        tokenVersion: 2,
      });
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: mockUser,
      });
    });
  });

  describe('registerUserLocal', () => {
    it('should create user and return access token', async () => {
      (usersService.create as jest.Mock).mockResolvedValue(mockUser);

      const registerDto = {
        email: 'test@example.com',
        nickname: 'testuser',
        password: 'Password123!',
        acceptTerms: true,
      };

      const result = await service.registerUserLocal(registerDto);

      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        provider: 'local',
        providerId: registerDto.email,
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: mockUser,
      });
    });
  });

  describe('generateJwtToken', () => {
    it('should default tokenVersion to 0 if not provided', () => {
      service.generateJwtToken({
        id: 'u-2',
        nickname: 'newUser',
        role: 'user',
        isProfileComplete: false,
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u-2',
        nickname: 'newUser',
        role: 'user',
        isProfileComplete: false,
        tokenVersion: 0,
      });
    });
  });
});
