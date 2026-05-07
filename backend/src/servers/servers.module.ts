import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { ServersGateway } from './servers.gateway';

@Module({
  imports: [HttpModule],
  providers: [ServersService, ServersGateway],
  controllers: [ServersController]
})
export class ServersModule {}
