import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class GatewayService {
  readonly onlineUsers = new Map<string, Socket>(); // userId -> Socket

  constructor(
    protected readonly jwtService: JwtService,
    protected readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.headers.cookie
      ?.split('; ')
      .find((cookie) => cookie.startsWith('access_token='))
      ?.slice('access_token='.length);

    console.log('New client connection attempt:', token);

    if (!token) {
      client.emit('error', { message: 'Unauthorized: No token provided' });
      console.log('Unauthorized connection attempt. Disconnecting...');
      client.disconnect(true);
      return;
    }

    try {
      // Need this to wait until database call is completed.
      client.data.ready = false;

      const decoded = this.jwtService.verify(token);

      const user = await this.usersService.findMe(decoded.sub);
      const tokenVersion = decoded.tokenVersion ?? 0;
      if (user.tokenVersion !== undefined && user.tokenVersion > tokenVersion) {
        throw new Error('Session has been revoked on all devices');
      }
      const elo = user.elo;

      Object.assign(client.data, { elo, ...decoded });

      client.data.ready = true;
      client.emit('ready');
    } catch (error) {
      console.log(
        'Unauthorized connection attempt:',
        error instanceof Error ? error.message : 'Invalid token',
      );
      client.disconnect(true);
      return;
    }

    // Fix : The old code used to set this for every namespace the client connected to,
    // but we only want to set it for the lobby namespace.
    // This is because the game and chat namespaces should not be used to track online users, as they are only for active games and chats.
    if (client.nsp.name === '/lobby') {
      this.onlineUsers.set(client.data.sub, client);
    }

    console.log('Client connected:', client.id);
    console.log('Online users:', this.onlineUsers.size);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const existingClient = this.onlineUsers.get(client.data.sub);
    if (existingClient?.id === client.id) {
      this.onlineUsers.delete(client.data.sub);
      console.log('Client disconnected:', client.id);
      console.log('Online users:', this.onlineUsers.size);
    } else {
      console.warn(
        `Client ${client.id} attempted to disconnect but was not found in online users map`,
      );
    }
  }
}
