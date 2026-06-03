// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OltDevice } from './olt-device.entity';
import { OnuDevice } from './onu-device.entity';
import { HardwareService } from './hardware.service';
import { HardwareController } from './hardware.controller';
import { SnmpService } from './snmp.service';
import { SshService } from './ssh.service';

@Module({
  imports: [TypeOrmModule.forFeature([OltDevice, OnuDevice])],
  providers: [HardwareService, SnmpService, SshService],
  controllers: [HardwareController],
  exports: [HardwareService],
})
export class HardwareModule {}
