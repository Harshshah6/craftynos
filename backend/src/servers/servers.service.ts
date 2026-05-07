import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class ServersService {
  private readonly logger = new Logger(ServersService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async createServer(userId: string, name: string, memory: number, softwareType: string = 'VANILLA', softwareVersion: string = 'LATEST', mods: string = '') {
    // 0. Ensure a user exists (since we don't have full auth yet)
    let user = await this.prisma.user.findFirst();
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: 'test@craftynos.com', password: 'hashedpassword' }
      });
    }
    const actualUserId = user.id;

    // 1. Find an available node
    let node = await this.prisma.node.findFirst();
    if (!node) {
      node = await this.prisma.node.create({
        data: {
          name: 'Local Node',
          address: 'http://localhost',
          daemonPort: 8080,
          memoryTotal: 16000,
          diskTotal: 100000,
          isOnline: true,
        }
      });
    }

    // 2. Assign a domain (using mc-router)
    // Create a subdomain based on the server name and a random slug
    const cleanName = name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const shortUuid = crypto.randomUUID().split('-')[0];
    const domain = `${cleanName}-${shortUuid}.craftynos.local`;

    // 3. Save to DB
    const server = await this.prisma.server.create({
      data: {
        name,
        memory,
        disk: 5000, // 5GB default
        cpuLimit: 100,
        domain: domain,
        userId: actualUserId,
        nodeId: node.id,
        softwareType,
        softwareVersion,
        mods,
        status: 'STARTING',
      },
    });

    // 4. Send request to Daemon to create the Docker container
    try {
      const daemonUrl = `${node.address}:${node.daemonPort}/servers/create`;
      this.logger.log(`Calling daemon at ${daemonUrl} to create server ${server.id}`);
      
      const response = await firstValueFrom(
        this.httpService.post(daemonUrl, {
          name: server.uuid,
          domain: server.domain,
          memoryMB: server.memory,
          softwareType: server.softwareType,
          softwareVersion: server.softwareVersion,
          mods: server.mods
        })
      );

      if (response.data.success) {
        await this.prisma.server.update({
          where: { id: server.id },
          data: { status: 'ONLINE' }, // Ideally OFFLINE until actually booted, but keeping simple
        });
        return { success: true, server };
      }
    } catch (error: any) {
      this.logger.error(`Failed to create server on daemon: ${error.message}`);
      await this.prisma.server.update({
        where: { id: server.id },
        data: { status: 'CRASHED' },
      });
      throw new Error('Failed to communicate with Node Daemon');
    }
  }


  async powerAction(serverId: string, action: 'start' | 'stop' | 'kill') {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { node: true },
    });

    if (!server) throw new Error('Server not found');

    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/craftynos-${server.uuid}/${action}`;
    
    try {
      await firstValueFrom(this.httpService.post(daemonUrl));
      
      let newStatus: any = 'STARTING';
      if (action === 'stop' || action === 'kill') newStatus = 'OFFLINE';

      await this.prisma.server.update({
        where: { id: server.id },
        data: { status: newStatus },
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to perform power action ${action} on ${serverId}: ${error.message}`);
      throw new Error(`Failed to ${action} server via Daemon`);
    }
  }

  async getUserServers(userId: string) {
    // For Phase 2 testing without auth, return all servers
    return this.prisma.server.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getServer(id: string) {
    return this.prisma.server.findUnique({
      where: { id },
      include: { node: true },
    });
  }

  // File Manager Proxies
  async listFiles(serverId: string, path: string) {
    const server = await this.getServer(serverId);
    if (!server) throw new Error('Server not found');
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files?path=${encodeURIComponent(path)}`;
    const response = await firstValueFrom(this.httpService.get(daemonUrl));
    return response.data;
  }

  async readFile(serverId: string, path: string) {
    const server = await this.getServer(serverId);
    if (!server) throw new Error('Server not found');
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files/read?path=${encodeURIComponent(path)}`;
    const response = await firstValueFrom(this.httpService.get(daemonUrl));
    return response.data;
  }

  async writeFile(serverId: string, path: string, content: string) {
    const server = await this.getServer(serverId);
    if (!server) throw new Error('Server not found');
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files/write`;
    const response = await firstValueFrom(this.httpService.put(daemonUrl, { path, content }));
    return response.data;
  }

  async deleteFile(serverId: string, path: string) {
    const server = await this.getServer(serverId);
    if (!server) throw new Error('Server not found');
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files?path=${encodeURIComponent(path)}`;
    const response = await firstValueFrom(this.httpService.delete(daemonUrl));
    return response.data;
  }
}
