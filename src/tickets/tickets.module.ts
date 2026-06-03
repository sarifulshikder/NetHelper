// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Ticket } from './ticket.entity';
import { TicketHistory } from './ticket-history.entity';
import { MaintenanceSchedule } from './maintenance-schedule.entity';
import { TicketService } from './ticket.service';
import { SlaService } from './sla.service';
import { MaintenanceService } from './maintenance.service';
import { TicketController } from './ticket.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketHistory, MaintenanceSchedule]),
    ScheduleModule.forRoot(),
  ],
  providers: [TicketService, SlaService, MaintenanceService],
  controllers: [TicketController],
  exports: [TicketService, SlaService, MaintenanceService],
})
export class TicketsModule {}
