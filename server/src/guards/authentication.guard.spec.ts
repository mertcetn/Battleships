import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthenticationGuard } from './authentication.guard';
import { UsersService } from '../users/users.service';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let reflector: jest.Mocked<Partial<Reflector>>;
  let usersService: jest.Mocked<Partial<UsersService>>;

  const createMockExecutionContext = (req: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    usersService = {
      getTokenVersion: jest.fn(),
    };

    guard = new AuthenticationGuard(
      jwtService as JwtService,
      reflector as Reflector,
      usersService as UsersService,
    );
  });

  it('should return true if skipAuth is set on route', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const context = createMockExecutionContext({});

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no token is found in cookies or authorization header', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const context = createMockExecutionContext({
      cookies: {},
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Unauthorized'),
    );
  });

  it('should throw UnauthorizedException if jwt verify fails', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const context = createMockExecutionContext({
      cookies: { access_token: 'invalid-token' },
    });
    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if tokenVersion in JWT is older than DB tokenVersion', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const req: any = {
      cookies: { access_token: 'stale-token' },
    };
    const context = createMockExecutionContext(req);

    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      tokenVersion: 1,
    });
    (usersService.getTokenVersion as jest.Mock).mockResolvedValue(2); // DB is on version 2

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Session expired. Please log in again.'),
    );
  });

  it('should set request.user and return true if tokenVersion matches DB tokenVersion', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const req: any = {
      cookies: { access_token: 'valid-token' },
    };
    const context = createMockExecutionContext(req);

    const decoded = {
      sub: 'user-1',
      nickname: 'Captain',
      role: 'user',
      isProfileComplete: true,
      tokenVersion: 2,
    };
    (jwtService.verify as jest.Mock).mockReturnValue(decoded);
    (usersService.getTokenVersion as jest.Mock).mockResolvedValue(2);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual(decoded);
  });

  it('should extract token from Bearer authorization header if cookie is absent', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const req: any = {
      headers: { authorization: 'Bearer header-token' },
    };
    const context = createMockExecutionContext(req);

    const decoded = {
      sub: 'user-1',
      tokenVersion: 0,
    };
    (jwtService.verify as jest.Mock).mockReturnValue(decoded);
    (usersService.getTokenVersion as jest.Mock).mockResolvedValue(0);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
  });
});
