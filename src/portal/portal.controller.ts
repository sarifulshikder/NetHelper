import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InvoiceStatus } from '../billing/invoice.entity';
import { TicketStatus, TicketCategory, TicketPriority } from '../tickets/ticket.entity';

@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('profile')
  @Roles('Customer')
  async getCustomerProfile(@Req() req: any) {
    const customerId = req.user.id;
    return this.portalService.getCustomerProfile(customerId);
  }

  @Get('invoices')
  @Roles('Customer')
  async getCustomerInvoices(
    @Req() req: any,
    @Query('status') status?: InvoiceStatus,
  ) {
    const customerId = req.user.id;
    return this.portalService.getCustomerInvoices(customerId, status);
  }

  @Post('invoices/:id/pay')
  @Roles('Customer')
  async payInvoice(
    @Req() req: any,
    @Param('id') invoiceId: string,
    @Body() body: {
      payment_method: 'wallet' | 'bkash' | 'stripe';
      gateway_reference?: string;
    },
  ) {
    const customerId = req.user.id;
    return this.portalService.payInvoice(
      customerId,
      invoiceId,
      body.payment_method,
      body.gateway_reference,
    );
  }

  @Post('tickets')
  @Roles('Customer')
  async createTicket(
    @Req() req: any,
    @Body() body: {
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
    },
  ) {
    const customerId = req.user.id;
    return this.portalService.createTicket(
      customerId,
      body.subject,
      body.description,
      body.category,
      body.priority || TicketPriority.MEDIUM,
    );
  }

  @Get('tickets')
  @Roles('Customer')
  async getCustomerTickets(
    @Req() req: any,
    @Query('status') status?: TicketStatus,
  ) {
    const customerId = req.user.id;
    return this.portalService.getCustomerTickets(customerId, status);
  }

  @Get('tickets/:id')
  @Roles('Customer')
  async getTicketById(@Req() req: any, @Param('id') ticketId: string) {
    const customerId = req.user.id;
    return this.portalService.getTicketById(customerId, ticketId);
  }

  @Get('usage')
  @Roles('Customer')
  async getUsageStatistics(@Req() req: any) {
    const customerId = req.user.id;
    return this.portalService.getUsageStatistics(customerId);
  }
}
