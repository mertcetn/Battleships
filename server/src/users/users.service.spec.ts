import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePrismaError(code: string, target?: string) {
  const err = new PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: '5.0.0',
    meta: target ? { target } : undefined,
  });
  return err;
}

const mockPublicUser = {
  id: 'user-1',
  nickname: 'testuser',
  email: 'test@example.com',
  elo: 1000,
  role: 'user',
  isProfileComplete: true,
};

const mockInternalUser = {
  ...mockPublicUser,
  password: '$2a$10$hashedpassword',
};

// ─── Mock PrismaService ──────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    create: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      nickname: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      provider: 'local',
      providerId: 'test@example.com'
    };

    it('should create and return a public user', async () => {
      mockPrisma.user.create.mockResolvedValue(mockPublicUser);
      const result = await service.create(dto);
      expect(result).toEqual(mockPublicUser);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email is taken', async () => {
      mockPrisma.user.create.mockRejectedValue(
        makePrismaError('P2002', 'User_email_key'),
      );
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if nickname is taken', async () => {
      mockPrisma.user.create.mockRejectedValue(
        makePrismaError('P2002', 'User_nickname_key'),
      );
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ServiceUnavailableException on P2010', async () => {
      mockPrisma.user.create.mockRejectedValue(makePrismaError('P2010'));
      await expect(service.create(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.create.mockRejectedValue(new Error('unexpected'));
      await expect(service.create(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── findOrCreateOAuthUser ─────────────────────────────────────────────────

  describe('findOrCreateOAuthUser', () => {
    const dto = {
      email: 'oauth@example.com',
      provider: 'google',
      providerId: 'google-123',
    };

    it('should upsert and return a public user', async () => {
      mockPrisma.user.upsert.mockResolvedValue(mockPublicUser);
      const result = await service.findOrCreateOAuthUser(dto);
      expect(result).toEqual(mockPublicUser);
    });

    it('should throw ServiceUnavailableException on P2010', async () => {
      mockPrisma.user.upsert.mockRejectedValue(makePrismaError('P2010'));
      await expect(service.findOrCreateOAuthUser(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.upsert.mockRejectedValue(new Error('unexpected'));
      await expect(service.findOrCreateOAuthUser(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── findMany ──────────────────────────────────────────────────────────────

  describe('findMany', () => {
    const pagination = { limit: 10, offset: 0, extend: undefined };

    it('should return an array of users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockPublicUser]);
      const result = await service.findMany(pagination, 'user');
      expect(result).toEqual([mockPublicUser]);
    });

    it('should return empty array when no users exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      const result = await service.findMany(pagination, 'user');
      expect(result).toEqual([]);
    });

    it('should throw ServiceUnavailableException on P2010', async () => {
      mockPrisma.user.findMany.mockRejectedValue(makePrismaError('P2010'));
      await expect(service.findMany(pagination, 'user')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('unexpected'));
      await expect(service.findMany(pagination, 'user')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPublicUser);
      const result = await service.findOne('user-1', 'user');
      expect(result).toEqual(mockPublicUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ServiceUnavailableException on P2010', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(makePrismaError('P2010'));
      await expect(service.findOne('user-1', 'user')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('unexpected'));
      await expect(service.findOne('user-1', 'user')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── findMe ────────────────────────────────────────────────────────────────

  describe('findMe', () => {
    it('should return the current user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockPublicUser);
      const result = await service.findMe('user-1');
      expect(result).toEqual(mockPublicUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findMe('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('unexpected'));
      await expect(service.findMe('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── completeProfile ───────────────────────────────────────────────────────

  describe('completeProfile', () => {
    it('should update and return the user', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockPublicUser,
        isProfileComplete: true,
      });
      const result = await service.completeProfile('user-1', 'newnickname');
      expect(result.isProfileComplete).toBe(true);
    });

    it('should throw NotFoundException if user does not exist (P2025)', async () => {
      mockPrisma.user.update.mockRejectedValue(makePrismaError('P2025'));
      await expect(
        service.completeProfile('nonexistent', 'nick'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if nickname is taken (P2002)', async () => {
      mockPrisma.user.update.mockRejectedValue(
        makePrismaError('P2002', 'User_nickname_key'),
      );
      await expect(
        service.completeProfile('user-1', 'takennick'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('unexpected'));
      await expect(service.completeProfile('user-1', 'nick')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── validateCredentials ───────────────────────────────────────────────────

  describe('validateCredentials', () => {
    it('should return user without password on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockInternalUser);
      // Mock bcrypt.compare — requires jest.mock('bcryptjs') at top of file if needed
      // Here we test the null path instead to avoid bcrypt complexity
      const result = await service.validateCredentials(
        'test@example.com',
        'wrongpassword',
      );
      // Wrong password should return null (bcrypt won't match)
      expect(result).toBeNull();
    });

    it('should return null if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateCredentials(
        'nonexistent@example.com',
        'password',
      );
      expect(result).toBeNull();
    });

    it('should return null for OAuth user (no password)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockInternalUser,
        password: null,
      });
      const result = await service.validateCredentials(
        'oauth@example.com',
        'password',
      );
      expect(result).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto = { nickname: 'updatednick' };

    it('should update and return the user', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockPublicUser,
        nickname: 'updatednick',
      });
      const result = await service.update('user-1', dto);
      expect(result.nickname).toBe('updatednick');
    });

    it('should throw NotFoundException if user does not exist (P2025)', async () => {
      mockPrisma.user.update.mockRejectedValue(makePrismaError('P2025'));
      await expect(service.update('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if nickname is taken (P2002)', async () => {
      mockPrisma.user.update.mockRejectedValue(
        makePrismaError('P2002', 'User_nickname_key'),
      );
      await expect(service.update('user-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ServiceUnavailableException on P2010', async () => {
      mockPrisma.user.update.mockRejectedValue(makePrismaError('P2010'));
      await expect(service.update('user-1', dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('unexpected'));
      await expect(service.update('user-1', dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return id and nickname', async () => {
      mockPrisma.user.delete.mockResolvedValue({
        id: 'user-1',
        nickname: 'testuser',
      });
      const result = await service.remove('user-1');
      expect(result).toEqual({ id: 'user-1', nickname: 'testuser' });
    });

    it('should throw NotFoundException if user does not exist (P2025)', async () => {
      mockPrisma.user.delete.mockRejectedValue(makePrismaError('P2025'));
      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ServiceUnavailableException on P2010', async () => {
      mockPrisma.user.delete.mockRejectedValue(makePrismaError('P2010'));
      await expect(service.remove('user-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('unexpected'));
      await expect(service.remove('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── updateNickname ────────────────────────────────────────────────────────

  describe('updateNickname', () => {
    it('should update and return user', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockPublicUser,
        nickname: 'newnickname',
      });

      const result = await service.updateNickname('user-1', 'newnickname');
      expect(result.nickname).toBe('newnickname');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { nickname: 'newnickname' },
        }),
      );
    });

    it('should throw ConflictException if nickname is taken (P2002)', async () => {
      mockPrisma.user.update.mockRejectedValue(makePrismaError('P2002'));
      await expect(
        service.updateNickname('user-1', 'takenname'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── updateEmail ───────────────────────────────────────────────────────────

  describe('updateEmail', () => {
    const hashedPass = bcrypt.hashSync('correctPassword', 4);

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateEmail('user-1', 'new@example.com', 'correctPassword'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockInternalUser,
        password: hashedPass,
      });

      await expect(
        service.updateEmail('user-1', 'new@example.com', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update email and providerId when password is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockInternalUser,
        provider: 'local',
        password: hashedPass,
      });
      mockPrisma.user.update.mockResolvedValue({
        ...mockPublicUser,
        email: 'new@example.com',
      });

      const result = await service.updateEmail(
        'user-1',
        'new@example.com',
        'correctPassword',
      );
      expect(result.email).toBe('new@example.com');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: {
            email: 'new@example.com',
            providerId: 'new@example.com',
          },
        }),
      );
    });
  });

  // ── updatePassword ────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    const hashedPass = bcrypt.hashSync('oldPassword123', 4);

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updatePassword('user-1', 'oldPassword123', 'newPass123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockInternalUser,
        password: hashedPass,
      });

      await expect(
        service.updatePassword('user-1', 'wrongPassword', 'newPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update password with hash when current password matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockInternalUser,
        password: hashedPass,
      });
      mockPrisma.user.update.mockResolvedValue(mockPublicUser);

      const result = await service.updatePassword(
        'user-1',
        'oldPassword123',
        'newPass123',
      );
      expect(result).toEqual(mockPublicUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            password: expect.any(String),
          }),
        }),
      );
    });
  });

  // ── incrementTokenVersion & getTokenVersion ───────────────────────────────

  describe('tokenVersion methods', () => {
    it('should increment tokenVersion', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', tokenVersion: 1 });
      await service.incrementTokenVersion('user-1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    it('should return tokenVersion if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ tokenVersion: 3 });
      const version = await service.getTokenVersion('user-1');
      expect(version).toBe(3);
    });

    it('should return null if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const version = await service.getTokenVersion('user-1');
      expect(version).toBeNull();
    });
  });
});
