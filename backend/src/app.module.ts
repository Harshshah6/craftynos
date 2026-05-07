import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServersModule } from './servers/servers.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, ServersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
