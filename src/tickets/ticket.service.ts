import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from './ticket.entity';
import { TicketHistory } from './ticket-history.entity';
import { SlaService } from './sla.service';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private ticketHistoryRepository: Repository<TicketHistory>,
    private readonly slaService: SlaService,
  ) {}

  async createTicket(
    schemaName: string,
    ticketData: {
      customer_id?: string;
      title: string;
      description: string;
      category?: TicketCategory;
      priority?: TicketPriority;
      zone_or_pop?: string;
      created_by: string;
    },
  ): Promise<Ticket> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Calculate SLA due date based on priority
      const slaDueAt = this.slaService.calculateSlaDueDate(
        ticketData.priority || TicketPriority.MEDIUM,
      );

      const ticket = connection.manager.create(Ticket, {
        customer_id: ticketData.customer_id,
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category || TicketCategory.GENERAL,
        priority: ticketData.priority || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        sla_due_at: slaDueAt,
        is_sla_breached: false,
        zone_or_pop: ticketData.zone_or_pop,
      });

      const savedTicket = await connection.manager.save(Ticket, ticket);

      // Create initial history entry
      await this.createTicketHistory(
        schemaName,
        savedTicket.id,
        ticketData.created_by,
        null,
        TicketStatus.OPEN,
        'Ticket created',
        'CREATE',
      );

      return savedTicket;
    } catch (error) {
      this.logger.error(`Failed to create ticket: ${error.message}`);
      throw error;
    }
  }

  async getTicketById(schemaName: string, id: string): Promise<Ticket> {
    const connection = await getTenantConnection(schemaName);

    try {
      const ticket = await connection.manager.findOne(Ticket, {
        where: { id },
        relations: ['history'],
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      return ticket;
    } catch (error) {
      this.logger.error(`Failed to get ticket: ${error.message}`);
      throw error;
    }
  }

  async getAllTickets(schemaName: string): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Ticket, {
        relations: ['history'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get tickets: ${error.message}`);
      throw error;
    }
  }

  async getTicketsByCustomer(
    schemaName: string,
    customerId: string,
  ): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Ticket, {
        where: { customer_id: customerId },
        relations: ['history'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get tickets by customer: ${error.message}`);
      throw error;
    }
  }

  async getTicketsByStaff(
    schemaName: string,
    staffId: string,
  ): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Ticket, {
        where: { assigned_staff_id: staffId },
        relations: ['history'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get tickets by staff: ${error.message}`);
      throw error;
    }
  }

  async getTicketsByStatus(
    schemaName: string,
    status: TicketStatus,
  ): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Ticket, {
        where: { status },
        relations: ['history'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get tickets by status: ${error.message}`);
      throw error;
    }
  }

  async getSlaBreachedTickets(schemaName: string): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Ticket, {
        where: { is_sla_breached: true },
        relations: ['history'],
        order: { sla_due_at: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get SLA breached tickets: ${error.message}`);
      throw error;
    }
  }

  async updateTicketStatus(
    schemaName: string,
    ticketId: string,
    newStatus: TicketStatus,
    updatedBy: string,
    comment?: string,
  ): Promise<Ticket> {
    const connection = await getTenantConnection(schemaName);

    try {
      const ticket = await connection.manager.findOne(Ticket, {
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const previousStatus = ticket.status;
      ticket.status = newStatus;

      // If ticket is being resolved or closed, set resolution time
      if (newStatus === TicketStatus.RESOLVED || newStatus === TicketStatus.CLOSED) {
        // In a real system, you might want to set a resolution_time field
      }

      const updatedTicket = await connection.manager.save(Ticket, ticket);

      // Create history entry
      await this.createTicketHistory(
        schemaName,
        ticketId,
        updatedBy,
        previousStatus,
        newStatus,
        comment || `Status changed from ${previousStatus} to ${newStatus}`,
        'STATUS_CHANGE',
      );

      return updatedTicket;
    } catch (error) {
      this.logger.error(`Failed to update ticket status: ${error.message}`);
      throw error;
    }
  }

  async assignTicket(
    schemaName: string,
    ticketId: string,
    staffId: string,
    assignedBy: string,
  ): Promise<Ticket> {
    const connection = await getTenantConnection(schemaName);

    try {
      const ticket = await connection.manager.findOne(Ticket, {
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      ticket.assigned_staff_id = staffId;

      const updatedTicket = await connection.manager.save(Ticket, ticket);

      // Create history entry
      await this.createTicketHistory(
        schemaName,
        ticketId,
        assignedBy,
        null,
        null,
        `Ticket assigned to staff ${staffId}`,
        'ASSIGN',
      );

      return updatedTicket;
    } catch (error) {
      this.logger.error(`Failed to assign ticket: ${error.message}`);
      throw error;
    }
  }

  async addComment(
    schemaName: string,
    ticketId: string,
    userId: string,
    comment: string,
  ): Promise<TicketHistory> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await this.createTicketHistory(
        schemaName,
        ticketId,
        userId,
        null,
        null,
        comment,
        'COMMENT',
      );
    } catch (error) {
      this.logger.error(`Failed to add comment: ${error.message}`);
      throw error;
    }
  }

  async resolveTicket(
    schemaName: string,
    ticketId: string,
    resolvedBy: string,
    resolutionNotes: string,
  ): Promise<Ticket> {
    const connection = await getTenantConnection(schemaName);

    try {
      const ticket = await this.updateTicketStatus(
        schemaName,
        ticketId,
        TicketStatus.RESOLVED,
        resolvedBy,
        `Ticket resolved: ${resolutionNotes}`,
      );

      // Update resolution notes
      ticket.resolution_notes = resolutionNotes;

      return await connection.manager.save(Ticket, ticket);
    } catch (error) {
      this.logger.error(`Failed to resolve ticket: ${error.message}`);
      throw error;
    }
  }

  async closeTicket(
    schemaName: string,
    ticketId: string,
    closedBy: string,
  ): Promise<Ticket> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await this.updateTicketStatus(
        schemaName,
        ticketId,
        TicketStatus.CLOSED,
        closedBy,
        'Ticket closed',
      );
    } catch (error) {
      this.logger.error(`Failed to close ticket: ${error.message}`);
      throw error;
    }
  }

  private async createTicketHistory(
    schemaName: string,
    ticketId: string,
    changedByUserId: string,
    previousStatus: string | null,
    newStatus: string | null,
    comment: string,
    action: string,
  ): Promise<TicketHistory> {
    const connection = await getTenantConnection(schemaName);

    try {
      const history = connection.manager.create(TicketHistory, {
        ticket_id: ticketId,
        changed_by_user_id: changedByUserId,
        previous_status: previousStatus,
        new_status: newStatus,
        comment,
        action,
      });

      return await connection.manager.save(TicketHistory, history);
    } catch (error) {
      this.logger.error(`Failed to create ticket history: ${error.message}`);
      throw error;
    }
  }

  async getTicketHistory(schemaName: string, ticketId: string): Promise<TicketHistory[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(TicketHistory, {
        where: { ticket_id: ticketId },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get ticket history: ${error.message}`);
      throw error;
    }
  }

  async searchTickets(
    schemaName: string,
    searchTerm: string,
  ): Promise<Ticket[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager
        .createQueryBuilder(Ticket, 'ticket')
        .where('ticket.title ILIKE :term', { term: `%${searchTerm}%` })
        .orWhere('ticket.description ILIKE :term', { term: `%${searchTerm}%` })
        .orWhere('ticket.id ILIKE :term', { term: `%${searchTerm}%` })
        .orderBy('ticket.created_at', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Failed to search tickets: ${error.message}`);
      throw error;
    }
  }
}
