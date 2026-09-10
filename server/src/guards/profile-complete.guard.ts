import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const skipAuth = this.reflector.getAllAndOverride<boolean>('skipAuth', [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipProfile = this.reflector.getAllAndOverride<boolean>(
      'skipProfileCheck',
      [context.getHandler(), context.getClass()],
    );

    if (skipAuth || skipProfile) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user;

    if (!user || !user.isProfileComplete) {
      throw new ForbiddenException('Profile is not complete');
    }
    return true;
  }
}
