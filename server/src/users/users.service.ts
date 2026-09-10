import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma/client';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from './dto/pagination.dto';
import {
  buildUserQuery,
  buildUserSelect,
  parseExtensions,
} from './users.helper';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateUserOAuthDto } from './dto/create-user-oauth.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { globalEventEmitter } from '../utils/eventEmitter';

type PublicUser = Pick<
  User,
  'id' | 'nickname' | 'elo' | 'role' | 'email' | 'isProfileComplete'
>;
type InternalUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'nickname'
  | 'password'
  | 'role'
  | 'isProfileComplete'
  | 'elo'
>;

const PUBLIC_USER_SELECT = {
  id: true,
  nickname: true,
  elo: true,
  role: true,
  email: true,
  isProfileComplete: true,
} as const;

const FRIEND_SELECT = {
  id: true,
  nickname: true,
  elo: true,
  role: true,
} as const;

const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8GryuVYJFA9qv1n5yH9iY7vHne'; // dummy bcrpyt hash for timing attack mitigation

// Handle specific Prisma errors in one place, can be used for all Prisma calls in this service
async function prismaCall<T>(prismaPromise: () => Promise<T>): Promise<T> {
  try {
    return await prismaPromise();
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          const field = err.meta?.target as string;
          if (field === 'User_email_key') {
            throw new ConflictException('Email already in use');
          }

          if (field === 'User_nickname_key') {
            throw new ConflictException('Nickname already in use');
          }

          throw new ConflictException('User already exists');

        case 'P2010':
          throw new ServiceUnavailableException('Database unreachable.');
        case 'P2025':
          throw new NotFoundException('User not found.');
      }
    }

    throw err;
  }
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string): Promise<string> {
    // bcrypt recommendation for interactive logins, increase for sensitive data
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const hashedPassword = await this.hashPassword(createUserDto.password);
    try {
      return await prismaCall(() =>
        this.prisma.user.create({
          data: {
            nickname: createUserDto.nickname,
            email: createUserDto.email,
            password: hashedPassword,
            provider: 'local',
            providerId: createUserDto.email, // Using email as providerId for local users
            isProfileComplete: true, // Local users are considered to have complete profiles by default
          },
          select: PUBLIC_USER_SELECT,
        }),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Failed to create user (${createUserDto.email}):`, err);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findOrCreateOAuthUser({
    email,
    provider,
    providerId,
  }: CreateUserOAuthDto): Promise<PublicUser> {
    try {
      return await prismaCall(() =>
        this.prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            provider,
            providerId,
            nickname: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, // Temporary nickname, should be updated by user later
          },
          select: PUBLIC_USER_SELECT,
        }),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Failed to find or create OAuth user (${email}):`, err);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findMany(
    { limit, offset, extend }: PaginationDto,
    role: string,
  ): Promise<PublicUser[]> {
    const extensions = parseExtensions(role, extend);

    try {
      return await prismaCall(() =>
        this.prisma.user.findMany({
          skip: offset,
          take: limit,
          select: buildUserSelect(extensions),
        }),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to find users');
    }
  }

  // External method with error handling, used for public API where we want to control the response
  async findOne(
    identifier: string,
    role: string,
    extend?: string,
  ): Promise<PublicUser> {
    const extensions = parseExtensions(role, extend);

    const query = buildUserQuery(identifier);

    try {
      const user = await prismaCall(() =>
        this.prisma.user.findUnique({
          where: query,
          select: buildUserSelect(extensions),
        }),
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async findMe(userId: string): Promise<PublicUser> {
    try {
      const user = await prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: PUBLIC_USER_SELECT,
        }),
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async acceptFriendRequest(userId: string, requesterId: string) {
    const [user, requester] = await Promise.all([
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { friends: true, friendRequestsReceived: true },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: requesterId },
          select: { friends: true, friendRequestsSent: true },
        }),
      ),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!requester) throw new NotFoundException('Requester not found');

    if (!user.friendRequestsReceived.includes(requesterId))
      throw new NotFoundException('No pending friend request from this user');

    if (user.friends.includes(requesterId))
      throw new ConflictException('Already friends');

    await Promise.all([
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: userId },
          data: {
            friends: { push: requesterId },
            friendRequestsReceived: {
              set: user.friendRequestsReceived.filter((id) => id !== requesterId),
            },
          },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: requesterId },
          data: {
            friends: { push: userId },
            friendRequestsSent: {
              set: requester.friendRequestsSent.filter((id) => id !== userId),
            },
          },
        }),
      ),
    ]);

    globalEventEmitter.emit('friend_activity', userId);
    globalEventEmitter.emit('friend_activity', requesterId);

    return { success: true };
  }

  async removeFriend(userId: string, friendId: string) {
    const [user, friend] = await Promise.all([
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { friends: true },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: friendId },
          select: { friends: true },
        }),
      ),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!friend) throw new NotFoundException('Friend not found');

    if (!user.friends.includes(friendId))
      throw new NotFoundException('This user is not in your friends list');

    await Promise.all([
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: userId },
          data: { friends: { set: user.friends.filter((id) => id !== friendId) } },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: friendId },
          data: { friends: { set: friend.friends.filter((id) => id !== userId) } },
        }),
      ),
    ]);

    globalEventEmitter.emit('friend_activity', userId);
    globalEventEmitter.emit('friend_activity', friendId);

    return { success: true };
  }
  async findFriends(userId: string) {
    const user = await prismaCall(() =>
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { friends: true },
      }),
    );
    if (!user) throw new NotFoundException('User not found');
    return prismaCall(() =>
      this.prisma.user.findMany({
        where: { id: { in: user.friends } },
        select: FRIEND_SELECT,
      }),
    );
  }

  async findPendingFriendRequests(userId: string) {
    const user = await prismaCall(() =>
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { friendRequestsReceived: true },
      }),
    );
    if (!user) throw new NotFoundException('User not found');

    return prismaCall(() =>
      this.prisma.user.findMany({
        where: { id: { in: user.friendRequestsReceived } },
        select: FRIEND_SELECT,
      }),
    );
  }
  async findSentFriendRequests(userId: string) {
    const user = await prismaCall(() =>
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { friendRequestsSent: true },
      }),
    );
    if (!user) throw new NotFoundException('User not found');

    return prismaCall(() =>
      this.prisma.user.findMany({
        where: { id: { in: user.friendRequestsSent } },
        select: FRIEND_SELECT,
      }),
    );
  }
  async sendFriendRequest(userId: string, targetId: string) {
    if (userId === targetId)
      throw new ConflictException('You cannot send a friend request to yourself');

    const [user, target] = await Promise.all([
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { friends: true, friendRequestsSent: true },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true },
        }),
      ),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!target) throw new NotFoundException('Target user not found');

    if (user.friends.includes(targetId))
      throw new ConflictException('Already friends');

    if (user.friendRequestsSent.includes(targetId))
      throw new ConflictException('Friend request already sent');

    await Promise.all([
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: targetId },
          data: { friendRequestsReceived: { push: userId } },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: userId },
          data: { friendRequestsSent: { push: targetId } },
        }),
      ),
    ]);

    globalEventEmitter.emit('friend_activity', userId);
    globalEventEmitter.emit('friend_activity', targetId);

    return { success: true };
  }
  async rejectFriendRequest(userId: string, requesterId: string) {
    const [user, requester] = await Promise.all([
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { friendRequestsReceived: true },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.findUnique({
          where: { id: requesterId },
          select: { friendRequestsSent: true },
        }),
      ),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!requester) throw new NotFoundException('Requester not found');

    if (!user.friendRequestsReceived.includes(requesterId))
      throw new NotFoundException('No pending friend request from this user');

    await Promise.all([
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: userId },
          data: {
            friendRequestsReceived: {
              set: user.friendRequestsReceived.filter((id) => id !== requesterId),
            },
          },
        }),
      ),
      prismaCall(() =>
        this.prisma.user.update({
          where: { id: requesterId },
          data: {
            friendRequestsSent: {
              set: requester.friendRequestsSent.filter((id) => id !== userId),
            },
          },
        }),
      ),
    ]);

    globalEventEmitter.emit('friend_activity', userId);
    globalEventEmitter.emit('friend_activity', requesterId);

    return { success: true };
  }

  // Internal method used for authentication where we need the password hash
  private async findOneInternal(email: string): Promise<InternalUser | null> {
    const user = await prismaCall(() =>
      this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          nickname: true,
          password: true,
          role: true,
          isProfileComplete: true,
          elo: true,
        },
      }),
    );

    return user;
  }

  async completeProfile(
    identifier: string,
    nickname: string,
  ): Promise<PublicUser> {
    try {
      return await prismaCall(() =>
        this.prisma.user.update({
          where: buildUserQuery(identifier),
          data: {
            nickname,
            isProfileComplete: true,
          },
          select: PUBLIC_USER_SELECT,
        }),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to complete profile');
    }
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<PublicUser | null> {
    const user = await this.findOneInternal(email);
    const hashToCompare = user?.password ?? DUMMY_HASH;

    const isValid = await bcrypt.compare(password, hashToCompare);

    // Always run bcrypt to prevent timing attacks, but reject if user not found or is an OAuth user
    if (!user || !user.password || !isValid) return null;
    const { password: _, ...strippedUser } = user;
    return strippedUser;
  }

  async update(
    identifier: string,
    updateUserDto: UpdateUserDto | AdminUpdateUserDto,
  ): Promise<PublicUser> {
    const query = buildUserQuery(identifier);

    const data = {
      ...updateUserDto,
      ...(updateUserDto.password && {
        password: await this.hashPassword(updateUserDto.password),
      }),
    };
    try {
      return await prismaCall(() =>
        this.prisma.user.update({
          where: query,
          data: data,
          select: PUBLIC_USER_SELECT,
        }),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(identifier: string): Promise<Pick<User, 'id' | 'nickname'>> {
    const query = buildUserQuery(identifier);

    try {
      return await prismaCall(() =>
        this.prisma.user.delete({
          where: query,
          select: {
            id: true,
            nickname: true,
          },
        }),
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
