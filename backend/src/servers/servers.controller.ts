import { Controller, Post, Body, Param, Get, Query, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post('create')
  async createServer(
    @Req() req: any,
    @Body() body: { name: string; memory: number; softwareType: string; softwareVersion: string; mods: string }
  ) {
    const userId = req.user.id;
    return this.serversService.createServer(userId, body.name, body.memory, body.softwareType, body.softwareVersion, body.mods);
  }

  @Post(':id/power')
  async powerAction(@Req() req: any, @Param('id') id: string, @Body() body: { action: 'start' | 'stop' | 'kill' | 'restart' }) {
    return this.serversService.powerAction(req.user.id, id, body.action);
  }

  @Get()
  async getServers(@Req() req: any) {
    return this.serversService.getUserServers(req.user.id);
  }

  @Get(':id')
  async getServer(@Req() req: any, @Param('id') id: string) {
    return this.serversService.getServer(req.user.id, id);
  }

  @Get(':id/status')
  async getServerStatus(@Req() req: any, @Param('id') id: string) {
    return this.serversService.getServerStatus(req.user.id, id);
  }

  // --- File Manager Endpoints ---
  @Get(':id/files')
  async listFiles(@Req() req: any, @Param('id') id: string, @Query('path') path: string = '') {
    return this.serversService.listFiles(req.user.id, id, path);
  }

  @Get(':id/files/read')
  async readFile(@Req() req: any, @Param('id') id: string, @Query('path') path: string) {
    return this.serversService.readFile(req.user.id, id, path);
  }

  @Put(':id/files/write')
  async writeFile(@Req() req: any, @Param('id') id: string, @Body() body: { path: string; content: string }) {
    return this.serversService.writeFile(req.user.id, id, body.path, body.content);
  }

  @Delete(':id/files')
  async deleteFile(@Req() req: any, @Param('id') id: string, @Query('path') path: string) {
    return this.serversService.deleteFile(req.user.id, id, path);
  }

  @Post(':id/files/rename')
  async renameFile(@Req() req: any, @Param('id') id: string, @Body() body: { oldPath: string; newPath: string }) {
    return this.serversService.renameFile(req.user.id, id, body.oldPath, body.newPath);
  }

  @Delete(':id')
  async deleteServer(@Req() req: any, @Param('id') id: string) {
    return this.serversService.deleteServer(req.user.id, id);
  }
}
