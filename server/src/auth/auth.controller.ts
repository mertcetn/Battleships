import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@SkipAuth()
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  async login(@Res() res: Response, @Body() loginDto: LoginDto) {
    const { access_token: token, user: user } =
      await this.authService.validateUser(loginDto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.IS_CROSS_ORIGIN === 'true' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ user: user });
  }

  @Post('register')
  async register(@Res() res: Response, @Body() registerDto: RegisterDto) {
    const { access_token: token, user: user } =
      await this.authService.registerUserLocal(registerDto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.IS_CROSS_ORIGIN === 'true' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ user: user });
  }

  // Passport handles the route on its own, it just needs to exist
  @UseGuards(AuthGuard('google'))
  @Get('google/login')
  googleLogin() {}

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() { user }: Request, @Res() res: Response) {
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/oauth-failure`);
    }

    console.log('Google OAuth callback user:', user);
    const token = await this.authService.generateJwtToken({
      id: user.sub,
      nickname: user.nickname,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      tokenVersion: (user as any).tokenVersion,
    });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.IS_CROSS_ORIGIN === 'true' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${process.env.FRONTEND_URL}/oauth-success`);
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.IS_CROSS_ORIGIN === 'true' ? 'none' : 'lax',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  @Post('logout-all')
  async logoutAll(@Req() req: Request, @Res() res: Response) {
    const token =
      req.cookies?.['access_token'] ||
      req.headers?.['authorization']?.split(' ')[1];

    if (token) {
      try {
        const decoded = this.jwtService.verify(token);
        await this.usersService.incrementTokenVersion(decoded.sub);
      } catch {
        // Continue clearing cookie even if token was already invalid/expired
      }
    }

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.IS_CROSS_ORIGIN === 'true' ? 'none' : 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out of all devices successfully',
    });
  }
}
