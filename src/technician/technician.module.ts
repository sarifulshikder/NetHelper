import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicianTask } from './entities/technician-task.entity';
import { TechnicianLocationLog } from './entities/technician-location-log.entity';
import { TechnicianService } from './technician.service';
import { TechnicianController } from './technician.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { RadiusModule } from '../radius/radius.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TechnicianTask, TechnicianLocationLog]),
    InventoryModule,
    RadiusModule,
    TicketsModule,
  ],
  providers: [TechnicianService],
  controllers: [TechnicianController],
  exports: [TechnicianService],
})
export class TechnicianModule {}
