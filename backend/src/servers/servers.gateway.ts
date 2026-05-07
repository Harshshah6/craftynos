import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ServersService } from './servers.service';
import { Logger } from '@nestjs/common';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

@WebSocketGateway({ cors: { origin: '*' } })
export class ServersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(ServersGateway.name);
  
  // Map of serverId -> Socket connection to the daemon
  private daemonConnections = new Map<string, ClientSocket>();

  constructor(private readonly serversService: ServersService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    setTimeout(() => this.cleanupDaemonConnections(), 100);
  }

  @SubscribeMessage('joinServerConsole')
  async handleJoinConsole(
    @MessageBody() serverId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`server_${serverId}`);
    this.logger.log(`Client ${client.id} joined console for server ${serverId}`);

    // If we aren't already listening to this server's daemon, connect to it
    if (!this.daemonConnections.has(serverId)) {
      try {
        const mcServer = await this.serversService.getServerInternal(serverId);
        if (!mcServer) return;

        // Connect to the specific node's daemon
        const daemonUrl = `${mcServer.node.address}:${mcServer.node.daemonPort}`;
        const daemonSocket = ioClient(daemonUrl);
        
        this.daemonConnections.set(serverId, daemonSocket);

        daemonSocket.on('connect', () => {
          this.logger.log(`Connected to daemon at ${daemonUrl} for server ${serverId}`);
          // Ask the daemon to attach to this specific Docker container
          daemonSocket.emit('attach', `craftynos-${mcServer.uuid}`);
        });

        // Forward logs from daemon to all clients in the room
        daemonSocket.on('log', (data: string) => {
          this.server.to(`server_${serverId}`).emit('log', data);
        });

        // Forward stats from daemon to all clients in the room
        daemonSocket.on('stats', (data: any) => {
          this.server.to(`server_${serverId}`).emit('stats', data);
        });

        daemonSocket.on('disconnect', () => {
          this.logger.log(`Disconnected from daemon for server ${serverId}`);
          this.daemonConnections.delete(serverId);
        });
      } catch (err) {
        this.logger.error(`Failed to connect to daemon for server ${serverId}`, err);
      }
    }
  }

  @SubscribeMessage('leaveServerConsole')
  handleLeaveConsole(
    @MessageBody() serverId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`server_${serverId}`);
    this.logger.log(`Client ${client.id} left console for server ${serverId}`);
    setTimeout(() => this.cleanupDaemonConnections(), 100);
  }

  private cleanupDaemonConnections() {
    for (const [serverId, daemonSocket] of this.daemonConnections.entries()) {
      const room = this.server.sockets.adapter.rooms.get(`server_${serverId}`);
      const clientCount = room ? room.size : 0;
      if (clientCount === 0) {
        this.logger.log(`Cleaning up unused daemon connection for server ${serverId}`);
        try {
          daemonSocket.disconnect();
        } catch (err) {
          this.logger.error(`Error disconnecting daemon socket:`, err);
        }
        this.daemonConnections.delete(serverId);
      }
    }
  }

  @SubscribeMessage('sendCommand')
  handleCommand(
    @MessageBody() payload: { serverId: string; command: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Received command from client for server ${payload.serverId}: ${payload.command}`);
    // Basic auth/check here in production to ensure client is in room
    const daemonSocket = this.daemonConnections.get(payload.serverId);
    if (daemonSocket) {
      this.logger.log(`Found daemon socket, forwarding command`);
      daemonSocket.emit('command', payload.command);
    } else {
      this.logger.warn(`No daemon socket found for server ${payload.serverId}`);
    }
  }
}
