import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import * as https from 'https';

import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
      tokenURL: 'https://oauth2.googleapis.com/token',
      userProfileURL: 'https://openidconnect.googleapis.com/v1/userinfo',
    });

    // Disable TLS session caching to prevent OpenSSL 0A0003E7 (invalid session id) EPROTO error on repeated token requests
    (this as any)._oauth2._agent = new https.Agent({
      maxCachedSessions: 0,
      keepAlive: false,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const user = await this.usersService.findOrCreateOAuthUser({
      email: profile.emails![0].value,
      provider: 'google',
      providerId: profile.id,
    });

    return { ...user, sub: user.id };
  }
}
