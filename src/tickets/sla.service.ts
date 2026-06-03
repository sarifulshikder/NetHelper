// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './ticket.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  // SLA time limits in hours
  private readonly slaLimits: Record<TicketPriority, number> = {
    [TicketPriority.CRITICAL]: 2, // 2 hours
    [TicketPriority.HIGH]: 6, // 6 hours
    [TicketPriority.MEDIUM]: 12, // 12 hours
    [TicketPriority.LOW]: 24, // 24 hours
  };

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  calculateSlaDueDate(priority: TicketPriority): Date {
    const hours = this.slaLimits[priority];
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + hours);
    return dueDate;
  }

  getSlaLimitHours(priority: TicketPriority): number {
    return this.slaLimits[priority];
  }

  async checkSlaBreaches(schemaName: string): Promise<number> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();
      
      // Find tickets that are still open or in progress but past their SLA due date
      const breachedTickets = await connection.manager
        .createQueryBuilder(Ticket, 'ticket')
        .where('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
        })
        .andWhere('ticket.sla_due_at < :now', { now })
        .andWhere('ticket.is_sla_breached = :breached', { breached: false })
        .getMany();

      let breachCount = 0;

      for (const ticket of breachedTickets) {
        ticket.is_sla_breached = true;
        await connection.manager.save(Ticket, ticket);
        breachCount++;

        this.logger.warn(
          `SLA breached for ticket ${ticket.id} (Priority: ${ticket.priority})`,
        );
      }

      return breachCount;
    } catch (error) {
      this.logger.error(`Failed to check SLA breaches: ${error.message}`);
      throw error;
    }
  }

  // Run every hour to check for SLA breaches
  @Cron(CronExpression.EVERY_HOUR)
  async checkAllTenantsForSlaBreaches() {
    this.logger.log('Starting SLA breach check for all tenants...');

    try {
      // In a real system, we would get all tenants from the tenant service
      // For this implementation, we'll assume we have a way to get tenant schemas
      const tenantSchemas = ['public']; // Would be dynamic in real system

      for (const schemaName of tenantSchemas) {
        try {
          const breachCount = await this.checkSlaBreaches(schemaName);
          if (breachCount > 0) {
            this.logger.log(
              `Found ${breachCount} SLA breaches in tenant ${schemaName}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to check SLA breaches for tenant ${schemaName}: ${error.message}`,
          );
        }
      }

      this.logger.log('SLA breach check completed');
    } catch (error) {
      this.logger.error(`SLA breach check failed: ${error.message}`);
    }
  }

  async getSlaComplianceStats(schemaName: string): Promise<{
    totalTickets: number;
    withinSla: number;
    breachedSla: number;
    complianceRate: number;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();

      const [totalTickets, breachedTickets] = await Promise.all([
        connection.manager.count(Ticket, {
          where: {
            status: TicketStatus.CLOSED,
          },
        }),
        connection.manager.count(Ticket, {
          where: {
            status: TicketStatus.CLOSED,
            is_sla_breached: true,
          },
        }),
      ]);

      const withinSla = totalTickets - breachedTickets;
      const complianceRate = totalTickets > 0 ? (withinSla / totalTickets) * 100 : 100;

      return {
        totalTickets,
        withinSla,
        breachedSla: breachedTickets,
        complianceRate,
      };
    } catch (error) {
      this.logger.error(`Failed to get SLA compliance stats: ${error.message}`);
      throw error;
    }
  }

  async getTicketsApproachingSla(schemaName: string, hoursThreshold: number = 2): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() + hoursThreshold);

      return await connection.manager
        .createQueryBuilder(Ticket, 'ticket')
        .where('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
        })
        .andWhere('ticket.sla_due_at BETWEEN :now AND :threshold', {
          now,
          threshold: thresholdDate,
        })
        .andWhere('ticket.is_sla_breached = :breached', { breached: false })
        .orderBy('ticket.sla_due_at', 'ASC')
        .getMany();
    } catch (error) {
      this.logger.error(`Failed to get tickets approaching SLA: ${error.message}`);
      throw error;
    }
  }
}
