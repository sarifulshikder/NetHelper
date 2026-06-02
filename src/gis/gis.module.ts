import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PopDevice } from './entities/pop-device.entity';
import { Zone } from './entities/zone.entity';
import { FiberJointBox } from './entities/fiber-joint-box.entity';
import { FiberCable } from './entities/fiber-cable.entity';
import { GisService } from './gis.service';
import { GisController } from './gis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PopDevice, Zone, FiberJointBox, FiberCable]),
  ],
  providers: [GisService],
  controllers: [GisController],
  exports: [GisService],
})
export class GisModule {}
