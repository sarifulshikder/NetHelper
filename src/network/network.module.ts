import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MikrotikService } from './mikrotik.service';
import { NetworkController } from './network.controller';
import { RadiusService } from '../radius/radius.service';
import { RadiusUser } from '../radius/radius-user.entity';
import { RadiusReply } from '../radius/radius-reply.entity';
import { RadiusAcct } from '../radius/radius-acct.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RadiusUser, RadiusReply, RadiusAcct]),
  ],
  providers: [MikrotikService, RadiusService],
  controllers: [NetworkController],
  exports: [MikrotikService, RadiusService],
})
export class NetworkModule {}
