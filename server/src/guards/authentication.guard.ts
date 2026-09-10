import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuth = this.reflector.getAllAndOverride<boolean>('skipAuth', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const token =
      request.cookies?.['access_token'] ||
      request.headers?.['authorization']?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const decoded = this.jwtService.verify(token);

      if (decoded.sub) {
        const currentVersion = await this.usersService.getTokenVersion(decoded.sub);
        const tokenVersion = decoded.tokenVersion ?? 0;
        if (currentVersion !== null && currentVersion > tokenVersion) {
          throw new UnauthorizedException('Session expired. Please log in again.');
        }
      }

      request.user = decoded;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const message = error instanceof Error ? error.message : 'Invalid token';
      throw new UnauthorizedException('Unauthorized', message);
    }
  }
}
