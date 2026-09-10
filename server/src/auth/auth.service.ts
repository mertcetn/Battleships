import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser({ email, password }: LoginDto) {
    const user = await this.usersService.validateCredentials(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateJwtToken(user);

    return { access_token: token, user: user };
  }

  async registerUserLocal(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      ...registerDto,
      provider: 'local',
      providerId: registerDto.email,
    });

    const token = this.generateJwtToken(user);
    return { access_token: token, user: user };
  }

  generateJwtToken(user: {
    id: string;
    nickname: string;
    role: string;
    isProfileComplete: boolean;
    tokenVersion?: number;
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
