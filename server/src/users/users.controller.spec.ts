import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockPublicUser = {
    id: 'user-1',
    nickname: 'testuser',
    email: 'test@example.com',
    elo: 1000,
    role: 'user',
    isProfileComplete: true,
    tokenVersion: 0,
  };

  const createMockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    usersService = {
      findMe: jest.fn(),
      updateNickname: jest.fn(),
      updateEmail: jest.fn(),
      updatePassword: jest.fn(),
      completeProfile: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findMe', () => {
    it('should return current user data', async () => {
      (usersService.findMe as jest.Mock).mockResolvedValue(mockPublicUser);
      const req: any = { user: { sub: 'user-1' } };

      const result = await controller.findMe(req);
      expect(result).toEqual(mockPublicUser);
      expect(usersService.findMe).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateNickname', () => {
    it('should update nickname, re-issue cookie, and return updated user', async () => {
      const updatedUser = { ...mockPublicUser, nickname: 'FleetAdmiral' };
      (usersService.updateNickname as jest.Mock).mockResolvedValue(updatedUser);

      const req: any = { user: { sub: 'user-1' } };
      const res = createMockResponse();

      const result = await controller.updateNickname(
        req,
        { nickname: 'FleetAdmiral' },
        res,
      );

      expect(usersService.updateNickname).toHaveBeenCalledWith(
        'user-1',
        'FleetAdmiral',
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          nickname: 'FleetAdmiral',
        }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.any(Object),
      );
      expect(result).toEqual({ user: updatedUser });
    });
  });

  describe('completeProfile', () => {
    it('should complete profile, re-issue cookie, and return updated user', async () => {
      const updatedUser = {
        ...mockPublicUser,
        nickname: 'FleetCommander',
        isProfileComplete: true,
      };
      (usersService.completeProfile as jest.Mock).mockResolvedValue(updatedUser);

      const req: any = { user: { sub: 'user-1' } };
      const res = createMockResponse();

      const result = await controller.completeProfile(
        req,
        { nickname: 'FleetCommander' },
        res,
      );

      expect(usersService.completeProfile).toHaveBeenCalledWith(
        'user-1',
        'FleetCommander',
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          nickname: 'FleetCommander',
          isProfileComplete: true,
        }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.any(Object),
      );
      expect(result).toEqual(
        expect.objectContaining({
          user: updatedUser,
        }),
      );
    });
  });

  describe('updateEmail', () => {
    it('should update email with password confirmation, re-issue cookie, and return user', async () => {
      const updatedUser = { ...mockPublicUser, email: 'newfleet@sea.com' };
      (usersService.updateEmail as jest.Mock).mockResolvedValue(updatedUser);

      const req: any = { user: { sub: 'user-1' } };
      const res = createMockResponse();

      const result = await controller.updateEmail(
        req,
        { email: 'newfleet@sea.com', password: 'currentSecret' },
        res,
      );

      expect(usersService.updateEmail).toHaveBeenCalledWith(
        'user-1',
        'newfleet@sea.com',
        'currentSecret',
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.any(Object),
      );
      expect(result).toEqual({ user: updatedUser });
    });
  });

  describe('updatePassword', () => {
    it('should update password, re-issue cookie, and return success message', async () => {
      (usersService.updatePassword as jest.Mock).mockResolvedValue(mockPublicUser);

      const req: any = { user: { sub: 'user-1' } };
      const res = createMockResponse();

      const result = await controller.updatePassword(
        req,
        { currentPassword: 'oldSecret', newPassword: 'NewPassword123' },
        res,
      );

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'oldSecret',
        'NewPassword123',
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'mock-jwt-token',
        expect.any(Object),
      );
      expect(result).toEqual({
        success: true,
        message: 'Password updated successfully',
      });
    });
  });

  describe('update authorization', () => {
    it('should throw ForbiddenException if user tries to update someone else', () => {
      const req: any = { user: { sub: 'user-1', role: 'user' } };
      expect(() =>
        controller.update(req, 'user-2', { nickname: 'hacker' }),
      ).toThrow(ForbiddenException);
    });

    it('should allow user to update their own profile', async () => {
      (usersService.update as jest.Mock).mockResolvedValue(mockPublicUser);
      const req: any = { user: { sub: 'user-1', role: 'user' } };

      await controller.update(req, 'user-1', { nickname: 'my-new-name' });
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        nickname: 'my-new-name',
      });
    });
  });
});
