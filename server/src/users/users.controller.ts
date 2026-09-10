import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Roles } from '../decorators/roles.decorator';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { SkipProfileCheck } from '../decorators/skip-profile-check.decorator';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { JwtService } from '@nestjs/jwt';
import {
  UpdateNicknameDto,
  UpdateEmailDto,
  UpdatePasswordDto,
} from './dto/update-credentials.dto';

@Roles(['admin', 'user']) // Default roles for all routes in this controller, can be overridden by specific routes
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Creates a new user in the database. This endpoint is protected and can only be accessed by users with the 'admin' role.
  For sign-up, use the /auth/register endpoint instead, which is public and does not require authentication. */
  @Roles(['admin'])
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findMany(@Req() { user }: Request, @Query() PaginationDto: PaginationDto) {
    return this.usersService.findMany(PaginationDto, user!.role || 'user');
  }

  @SkipAuth()
  @Get('keep-alive')
  keepAlive() {
    return { message: 'Server is alive' };
  }

  @SkipProfileCheck()
  @Get('me')
  findMe(@Req() { user }: Request) {
    return this.usersService.findMe(user!.sub!);
  }

  @Get('me/friends')
  findFriends(@Req() { user }: Request) {
    return this.usersService.findFriends(user!.sub!);
  }

  @Get('me/friends/:friendId')
  findFriend(@Req() { user }: Request, @Param('friendId') friendId: string) {
    return this.usersService.findOne(friendId, user!.role || 'user');
  }

  @Delete('me/friends/:friendId')
  removeFriend(@Req() { user }: Request, @Param('friendId') friendId: string) {
    return this.usersService.removeFriend(user!.sub!, friendId);
  }

  @Get('me/friend-requests')
  findPendingFriendRequests(@Req() { user }: Request) {
    return this.usersService.findPendingFriendRequests(user!.sub!);
  }

  @Get('me/friend-requests/sent')
  findSentFriendRequests(@Req() { user }: Request) {
    return this.usersService.findSentFriendRequests(user!.sub!);
  }

  @Post('me/friend-requests/:targetId')
  sendFriendRequest(
    @Req() { user }: Request,
    @Param('targetId') targetId: string,
  ) {
    return this.usersService.sendFriendRequest(user!.sub!, targetId);
  }

  @Patch('me/friend-requests/:requesterId')
  acceptFriendRequest(
    @Req() { user }: Request,
    @Param('requesterId') requesterId: string,
  ) {
    return this.usersService.acceptFriendRequest(user!.sub!, requesterId);
  }

  @Delete('me/friend-requests/:requesterId')
  rejectFriendRequest(
    @Req() { user }: Request,
    @Param('requesterId') requesterId: string,
  ) {
    return this.usersService.rejectFriendRequest(user!.sub!, requesterId);
  }

  @Get(':identifier')
  findOne(
    @Req() { user }: Request,
    @Param('identifier') identifier: string,
    @Query('extend') extend?: string,
  ) {
    return this.usersService.findOne(identifier, user!.role || 'user', extend);
  }

  @Patch(':identifier')
  update(
    @Req() { user }: Request,
    @Param('identifier') identifier: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const isSelf = identifier === user!.sub || identifier === user!.nickname;
    const isAdmin = user!.role === 'admin';

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Regular users cannot change their role, or elo
    // FIXED: Seperated Admin and User update dtos and endpoints

    return this.usersService.update(identifier, updateUserDto);
  }

  @Roles(['admin'])
  @Patch(':identifier/admin')
  adminUpdate(
    @Param('identifier') identifier: string,
    @Body() adminUpdateUserDto: AdminUpdateUserDto,
  ) {
    return this.usersService.update(identifier, adminUpdateUserDto);
  }

  @SkipProfileCheck()
  @Patch('me/complete-profile')
  async completeProfile(
    @Req() { user }: Request,
    @Body() dto: CompleteProfileDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updatedUser = await this.usersService.completeProfile(
      user!.sub!,
      dto.nickname,
    );
    const token = this.generateToken(updatedUser);
    this.setAuthCookie(res, token);
    return { user: updatedUser, ...updatedUser };
  }

  @Patch('me/nickname')
  async updateNickname(
    @Req() { user }: Request,
    @Body() dto: UpdateNicknameDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updatedUser = await this.usersService.updateNickname(
      user!.sub!,
      dto.nickname,
    );
    const token = this.generateToken(updatedUser);
    this.setAuthCookie(res, token);
    return { user: updatedUser };
  }

  @Patch('me/email')
  async updateEmail(
    @Req() { user }: Request,
    @Body() dto: UpdateEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updatedUser = await this.usersService.updateEmail(
      user!.sub!,
      dto.email,
      dto.password,
    );
    const token = this.generateToken(updatedUser);
    this.setAuthCookie(res, token);
    return { user: updatedUser };
  }

  @Patch('me/password')
  async updatePassword(
    @Req() { user }: Request,
    @Body() dto: UpdatePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updatedUser = await this.usersService.updatePassword(
      user!.sub!,
      dto.currentPassword,
      dto.newPassword,
    );
    const token = this.generateToken(updatedUser);
    this.setAuthCookie(res, token);
    return { success: true, message: 'Password updated successfully' };
  }

  @Roles(['admin'])
  @Delete(':identifier')
  remove(@Param('identifier') identifier: string) {
    return this.usersService.remove(identifier);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.IS_CROSS_ORIGIN === 'true' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private generateToken(user: {
    id: string;
    nickname: string;
    role: string;
    isProfileComplete: boolean;
    tokenVersion?: number | null;
  }) {
    const payload = {
      sub: user.id,
      nickname: user.nickname,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      tokenVersion: user.tokenVersion ?? 0,
    };
    return this.jwtService.sign(payload);
  }
}
