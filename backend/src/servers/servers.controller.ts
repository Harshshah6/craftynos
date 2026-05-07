import { Controller, Post, Body, Param, Get, Query, Put, Delete } from '@nestjs/common';
import { ServersService } from './servers.service';

@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post('create')
  async createServer(@Body() body: { name: string; memory: number }) {
    // Hardcoded user ID for testing since we skipped full JWT auth implementation in Phase 1
    // Usually this comes from req.user extracted by the JwtAuthGuard
    const userId = "test-user-id"; 
    return this.serversService.createServer(userId, body.name, body.memory);
  }

  @Post(':id/power')
  async powerAction(@Param('id') id: string, @Body() body: { action: 'start' | 'stop' | 'kill' }) {
    return this.serversService.powerAction(id, body.action);
  }

  @Get()
  async getServers() {
    const userId = "test-user-id";
    return this.serversService.getUserServers(userId);
  }

  @Get(':id')
  async getServer(@Param('id') id: string) {
    // In a real app, verify ownership with userId
    return this.serversService.getServer(id);
  }

  // --- File Manager Endpoints ---
  @Get(':id/files')
  async listFiles(@Param('id') id: string, @Query('path') path: string = '') {
    return this.serversService.listFiles(id, path);
  }

  @Get(':id/files/read')
  async readFile(@Param('id') id: string, @Query('path') path: string) {
    return this.serversService.readFile(id, path);
  }

  @Put(':id/files/write')
  async writeFile(@Param('id') id: string, @Body() body: { path: string; content: string }) {
    return this.serversService.writeFile(id, body.path, body.content);
  }

  @Delete(':id/files')
  async deleteFile(@Param('id') id: string, @Query('path') path: string) {
    return this.serversService.deleteFile(id, path);
  }
}
