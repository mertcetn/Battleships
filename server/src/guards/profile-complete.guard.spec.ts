import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfileCompleteGuard } from './profile-complete.guard';

describe('ProfileCompleteGuard', () => {
  let guard: ProfileCompleteGuard;
  let reflector: jest.Mocked<Partial<Reflector>>;

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
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new ProfileCompleteGuard(reflector as Reflector);
  });

  it('should return true if skipAuth is set on route', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === 'skipAuth') return true;
      return false;
    });

    const context = createMockExecutionContext({});
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should return true if skipProfileCheck is set on route', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === 'skipProfileCheck') return true;
      return false;
    });

    const context = createMockExecutionContext({});
    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is not attached to request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    const context = createMockExecutionContext({});
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Profile is not complete'),
    );
  });

  it('should throw ForbiddenException if user.isProfileComplete is false', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    const context = createMockExecutionContext({
      user: {
        sub: 'user-1',
        nickname: 'user_temp123',
        isProfileComplete: false,
      },
    });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Profile is not complete'),
    );
  });

  it('should return true if user.isProfileComplete is true', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    const context = createMockExecutionContext({
      user: {
        sub: 'user-1',
        nickname: 'FleetCommander',
        isProfileComplete: true,
      },
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
