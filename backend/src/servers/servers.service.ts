import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const actualUserId = userId;

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
    // Create a subdomain based on the server name
    const cleanName = name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const baseDomain = `${cleanName}.lulli.qzz.io`;
    
    // Check if the base domain already exists in DB
    const existingServer = await this.prisma.server.findUnique({
      where: { domain: baseDomain }
    });

    let domain = baseDomain;
    if (existingServer) {
      const shortUuid = crypto.randomUUID().split('-')[0];
      domain = `${cleanName}-${shortUuid}.lulli.qzz.io`;
    }

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

  async renameAndRedomainServer(userId: string, serverId: string, name?: string, subdomain?: string) {
    const server = await this.getOwnedServer(userId, serverId);

    let finalDomain = server.domain;
    
    if (subdomain !== undefined && subdomain !== null) {
      // Normalize subdomain input
      let cleanSubdomain = subdomain.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // If they passed a full domain like 'foo.lulli.qzz.io', extract just the subdomain part
      if (cleanSubdomain.endsWith('.lulli.qzz.io')) {
        cleanSubdomain = cleanSubdomain.replace('.lulli.qzz.io', '');
      }
      
      // Empty check
      if (!cleanSubdomain) {
        throw new Error('Subdomain cannot be empty.');
      }
      
      finalDomain = `${cleanSubdomain}.lulli.qzz.io`;
      
      // Check if domain is already taken by another server
      const existing = await this.prisma.server.findUnique({
        where: { domain: finalDomain }
      });
      
      if (existing && existing.id !== server.id) {
        throw new Error(`Domain ${finalDomain} is already registered to another server.`);
      }
    }

    // Prepare DB updates
    const dataToUpdate: any = {};
    if (name !== undefined && name !== null && name.trim() !== '') {
      dataToUpdate.name = name.trim();
    }
    
    if (finalDomain !== server.domain) {
      dataToUpdate.domain = finalDomain;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return { success: true, server };
    }

    // If domain changed, call the daemon to update Docker container label
    if (finalDomain !== server.domain) {
      try {
        const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/update-domain`;
        this.logger.log(`Calling daemon at ${daemonUrl} to update domain to ${finalDomain}`);
        await firstValueFrom(
          this.httpService.post(daemonUrl, { domain: finalDomain })
        );
      } catch (error: any) {
        this.logger.error(`Failed to update domain on daemon: ${error.message}`);
        throw new Error('Failed to update routing labels on Node Daemon');
      }
    }

    // Update in DB
    const updatedServer = await this.prisma.server.update({
      where: { id: serverId },
      data: dataToUpdate,
    });

    return { success: true, server: updatedServer };
  }

  async sendConsoleCommand(userId: string, serverId: string, command: string) {
    const server = await this.getOwnedServer(userId, serverId);
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/craftynos-${server.uuid}/command`;
    try {
      const response = await firstValueFrom(
        this.httpService.post(daemonUrl, { command })
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Command execution failed: ${error.message}`);
      throw new Error('Failed to run console command on Node Daemon');
    }
  }


  async powerAction(userId: string, serverId: string, action: 'start' | 'stop' | 'kill' | 'restart') {
    const server = await this.getOwnedServer(userId, serverId);

    if(action === 'restart') {
      await this.powerAction(userId, serverId, 'stop');
      await this.powerAction(userId, serverId, 'start');
      return { success: true };
    }

    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/craftynos-${server.uuid}/${action}`;
    
    try {
      await firstValueFrom(this.httpService.post(daemonUrl));
      
      // Update logic for all actions
      let newStatus: any;
      if (action === 'start') {
        newStatus = 'ONLINE';
      } else if (action === 'stop' || action === 'kill') {
        newStatus = 'OFFLINE';
      }

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
    return this.prisma.server.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getServer(userId: string, id: string) {
    return this.getOwnedServer(userId, id);
  }

  async getServerInternal(id: string) {
    return this.prisma.server.findUnique({
      where: { id },
      include: { node: true },
    });
  }

  // File Manager Proxies
  async listFiles(userId: string, serverId: string, path: string) {
    const server = await this.getOwnedServer(userId, serverId);
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files?path=${encodeURIComponent(path)}`;
    const response = await firstValueFrom(this.httpService.get(daemonUrl));
    return response.data;
  }

  async readFile(userId: string, serverId: string, path: string, encoding?: string) {
    const server = await this.getOwnedServer(userId, serverId);
    let daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files/read?path=${encodeURIComponent(path)}`;
    if (encoding) {
      daemonUrl += `&encoding=${encoding}`;
    }
    const response = await firstValueFrom(this.httpService.get(daemonUrl));
    return response.data;
  }

  async writeFile(userId: string, serverId: string, path: string, content: string, encoding?: string) {
    const server = await this.getOwnedServer(userId, serverId);
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files/write`;
    const response = await firstValueFrom(this.httpService.put(daemonUrl, { path, content, encoding }));
    return response.data;
  }

  async getServerStatus(userId: string, serverId: string) {
    const server = await this.getOwnedServer(userId, serverId);

    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/craftynos-${server.uuid}/status`;
    try {
      const response = await firstValueFrom(this.httpService.get(daemonUrl));
      const { status, dockerState, startedAt } = response.data;

      // Sync DB status with real container state
      if (status !== server.status) {
        await this.prisma.server.update({
          where: { id: serverId },
          data: { status },
        });
      }

      return { status, dockerState, startedAt };
    } catch (error: any) {
      this.logger.error(`Status check failed for ${serverId}: ${error.message}`);
      // If daemon is unreachable, return the last known DB status
      return { status: server.status, dockerState: 'unknown', startedAt: null };
    }
  }

  async deleteFile(userId: string, serverId: string, path: string) {
    const server = await this.getOwnedServer(userId, serverId);
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files?path=${encodeURIComponent(path)}`;
    const response = await firstValueFrom(this.httpService.delete(daemonUrl));
    return response.data;
  }

  async renameFile(userId: string, serverId: string, oldPath: string, newPath: string) {
    const server = await this.getOwnedServer(userId, serverId);
    const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}/files/rename`;
    const response = await firstValueFrom(
      this.httpService.post(daemonUrl, { oldPath, newPath })
    );
    return response.data;
  }

  async deleteServer(userId: string, serverId: string) {
    const server = await this.getOwnedServer(userId, serverId);

    // Call Daemon to completely wipe container & server-data directory
    try {
      const daemonUrl = `${server.node.address}:${server.node.daemonPort}/servers/${server.uuid}`;
      this.logger.log(`Calling daemon at DELETE ${daemonUrl} to destroy server ${server.id}`);
      await firstValueFrom(this.httpService.delete(daemonUrl));
    } catch (error: any) {
      this.logger.error(`Failed to delete server from daemon: ${error.message}`);
      // Continue DB deletion even if daemon call fails to ensure DB isn't stuck with dead records
    }

    // Delete from DB
    await this.prisma.server.delete({
      where: { id: serverId },
    });

    return { success: true };
  }

  async getOwnedServer(userId: string, serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { node: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.userId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this server');
    }

    return server;
  }
}
