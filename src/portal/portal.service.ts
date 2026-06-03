// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../crm/customer.entity';
import { Invoice, InvoiceStatus } from '../billing/invoice.entity';
import { InvoiceItem } from '../billing/invoice-item.entity';
import { Wallet } from '../wallet/wallet.entity';
import { WalletTransaction, WalletTransactionType } from '../wallet/wallet-transaction.entity';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../tickets/ticket.entity';
import { TicketHistory } from '../tickets/ticket-history.entity';
import { BillingService } from '../billing/billing.service';
import { WalletService } from '../wallet/wallet.service';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentGatewayType } from '../payments/payment-gateway.interface';

interface CustomerProfileResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  service_plan: string;
  connection_type: string;
  is_active: boolean;
  activation_date: Date | null;
  wallet_balance: number;
  current_invoice?: {
    id: string;
    invoice_number: string;
    amount: number;
    due_date: Date;
    status: InvoiceStatus;
  };
}

interface InvoiceResponse {
  id: string;
  invoice_number: string;
  date: Date;
  due_date: Date;
  amount: number;
  status: InvoiceStatus;
  items: {
    description: string;
    amount: number;
  }[];
}

interface UsageStatistics {
  daily: {
    date: string;
    download_gb: number;
    upload_gb: number;
    total_gb: number;
  }[];
  monthly: {
    month: string;
    download_gb: number;
    upload_gb: number;
    total_gb: number;
  }[];
  current_plan: {
    name: string;
    speed: string;
    data_limit_gb: number;
    used_percentage: number;
  };
}

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private ticketHistoryRepository: Repository<TicketHistory>,
    private billingService: BillingService,
    private walletService: WalletService,
    private ticketsService: TicketsService,
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  // Get customer profile
  async getCustomerProfile(customerId: string): Promise<CustomerProfileResponse> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      relations: ['invoices', 'wallets'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Get current wallet balance
    const wallet = await this.walletRepository.findOne({
      where: { customer_id: customerId },
    });

    // Get current/pending invoice
    const currentInvoice = await this.invoiceRepository.findOne({
      where: {
        customer_id: customerId,
        status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]),
      },
      order: { due_date: 'ASC' },
    });

    const response: CustomerProfileResponse = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || '',
      service_plan: customer.service_plan || 'Standard',
      connection_type: customer.connection_type || 'Fiber',
      is_active: customer.is_active,
      activation_date: customer.activation_date,
      wallet_balance: wallet ? wallet.balance : 0,
    };

    if (currentInvoice) {
      response.current_invoice = {
        id: currentInvoice.id,
        invoice_number: currentInvoice.invoice_number,
        amount: currentInvoice.total_amount,
        due_date: currentInvoice.due_date,
        status: currentInvoice.status,
      };
    }

    return response;
  }

  // Get customer invoices
  async getCustomerInvoices(
    customerId: string,
    status?: InvoiceStatus,
  ): Promise<InvoiceResponse[]> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.customer_id = :customerId', { customerId })
      .leftJoinAndSelect('invoice.items', 'items')
      .orderBy('invoice.due_date', 'DESC');

    if (status) {
      query.andWhere('invoice.status = :status', { status });
    }

    const invoices = await query.getMany();

    return invoices.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      amount: invoice.total_amount,
      status: invoice.status,
      items: invoice.items.map((item) => ({
        description: item.description,
        amount: item.amount,
      })),
    }));
  }

  // Pay invoice
  async payInvoice(
    customerId: string,
    invoiceId: string,
    paymentMethod: 'wallet' | 'bkash' | 'stripe',
    gatewayReference?: string,
  ): Promise<{
    success: boolean;
    message: string;
    invoice: InvoiceResponse;
    transaction?: any;
  }> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Get customer and invoice
      const customer = await transactionalEntityManager.findOne(Customer, {
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const invoice = await transactionalEntityManager.findOne(Invoice, {
        where: { id: invoiceId, customer_id: customerId },
        relations: ['items'],
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Invoice is already paid');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Invoice is cancelled');
      }

      const amountToPay = invoice.total_amount - (invoice.paid_amount || 0);

      // Process payment based on method
      if (paymentMethod === 'wallet') {
        // Pay from wallet balance
        const wallet = await transactionalEntityManager.findOne(Wallet, {
          where: { customer_id: customerId },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        if (wallet.balance < amountToPay) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        // Deduct from wallet
        await this.walletService.deductWalletBalance(
          wallet.id,
          amountToPay,
          `Payment for invoice ${invoice.invoice_number}`,
        );

        // Mark invoice as paid
        invoice.paid_amount = invoice.total_amount;
        invoice.status = InvoiceStatus.PAID;
        invoice.payment_date = new Date();
        invoice.payment_method = 'Wallet';

        await transactionalEntityManager.save(Invoice, invoice);

        // Send payment received notification
        await this.notificationsService.sendPaymentReceivedNotification(
          customerId,
          amountToPay,
          invoice.invoice_number,
        );

        return {
          success: true,
          message: 'Invoice paid successfully using wallet balance',
          invoice: this.mapInvoiceToResponse(invoice),
        };
      } else {
        // Process through payment gateway
        const gatewayType =
          paymentMethod === 'bkash' ? PaymentGatewayType.BKASH : PaymentGatewayType.STRIPE;

        const paymentResult = await this.paymentsService.processPayment(
          customerId,
          amountToPay,
          'BDT',
          gatewayType,
          `Invoice ${invoice.invoice_number}`,
          gatewayReference,
        );

        if (!paymentResult.success) {
          throw new BadRequestException(
            paymentResult.error || 'Payment processing failed',
          );
        }

        // Mark invoice as paid
        invoice.paid_amount = invoice.total_amount;
        invoice.status = InvoiceStatus.PAID;
        invoice.payment_date = new Date();
        invoice.payment_method = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);

        await transactionalEntityManager.save(Invoice, invoice);

        // Send payment received notification
        await this.notificationsService.sendPaymentReceivedNotification(
          customerId,
          amountToPay,
          invoice.invoice_number,
        );

        return {
          success: true,
          message: 'Invoice paid successfully via payment gateway',
          invoice: this.mapInvoiceToResponse(invoice),
          transaction: paymentResult.transaction,
        };
      }
    });
  }

  // Create ticket
  async createTicket(
    customerId: string,
    subject: string,
    description: string,
    category: TicketCategory,
    priority: TicketPriority = TicketPriority.MEDIUM,
  ): Promise<Ticket> {
    // Create ticket
    const ticket = await this.ticketsService.createTicket({
      customer_id: customerId,
      subject: subject,
      description: description,
      category: category,
      priority: priority,
      type: 'CUSTOMER_SUPPORT',
    });

    // Send notification to customer
    await this.notificationsService.sendTicketUpdatedNotification(
      customerId,
      ticket.id,
      ticket.status,
      'Support Team',
    );

    return ticket;
  }

  // Get customer tickets
  async getCustomerTickets(
    customerId: string,
    status?: TicketStatus,
  ): Promise<any[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.customer_id = :customerId', { customerId })
      .leftJoinAndSelect('ticket.history', 'history')
      .orderBy('ticket.updated_at', 'DESC');

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    const tickets = await query.getMany();

    return tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      sla_due_date: ticket.sla_due_date,
      history: ticket.history.map((h) => ({
        action: h.action,
        notes: h.notes,
        created_at: h.created_at,
        created_by: h.created_by,
      })),
    }));
  }

  // Get usage statistics
  async getUsageStatistics(customerId: string): Promise<UsageStatistics> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Simulate usage data based on customer's service plan
    const planDataLimits: Record<string, number> = {
      'Basic': 100,
      'Standard': 200,
      'Premium': 500,
      'Business': 1000,
    };

    const dataLimit = planDataLimits[customer.service_plan || 'Standard'] || 200;

    // Generate simulated daily usage for last 7 days
    const dailyUsage = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Higher usage on weekends
      const usageFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 0.9;
      const baseUsage = (dataLimit / 30) * usageFactor; // Monthly limit divided by days
      const downloadGb = parseFloat((baseUsage * 0.65).toFixed(2));
      const uploadGb = parseFloat((baseUsage * 0.35).toFixed(2));

      dailyUsage.push({
        date: date.toISOString().split('T')[0],
        download_gb: downloadGb,
        upload_gb: uploadGb,
        total_gb: parseFloat((downloadGb + uploadGb).toFixed(2)),
      });
    }

    // Generate simulated monthly usage for last 6 months
    const monthlyUsage = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today);
      month.setMonth(today.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

      // Vary usage by month (higher in winter months)
      const monthFactor = [1.1, 1.0, 0.9, 0.8, 0.9, 1.0][i % 6];
      const monthlyDataLimit = dataLimit * monthFactor;
      const downloadGb = parseFloat((monthlyDataLimit * 0.65).toFixed(2));
      const uploadGb = parseFloat((monthlyDataLimit * 0.35).toFixed(2));

      monthlyUsage.push({
        month: monthName,
        download_gb: downloadGb,
        upload_gb: uploadGb,
        total_gb: parseFloat((downloadGb + uploadGb).toFixed(2)),
      });
    }

    // Calculate current usage percentage
    const currentMonthUsage = monthlyUsage[0].total_gb;
    const usedPercentage = parseFloat(((currentMonthUsage / dataLimit) * 100).toFixed(2));

    return {
      daily: dailyUsage,
      monthly: monthlyUsage,
      current_plan: {
        name: customer.service_plan || 'Standard',
        speed: this.getPlanSpeed(customer.service_plan),
        data_limit_gb: dataLimit,
        used_percentage: Math.min(usedPercentage, 100), // Cap at 100%
      },
    };
  }

  // Helper method to map invoice to response
  private mapInvoiceToResponse(invoice: Invoice): InvoiceResponse {
    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      amount: invoice.total_amount,
      status: invoice.status,
      items: invoice.items.map((item) => ({
        description: item.description,
        amount: item.amount,
      })),
    };
  }

  // Helper method to get plan speed
  private getPlanSpeed(plan: string): string {
    const speeds: Record<string, string> = {
      'Basic': '10 Mbps',
      'Standard': '30 Mbps',
      'Premium': '100 Mbps',
      'Business': '300 Mbps',
    };
    return speeds[plan] || '30 Mbps';
  }

  // Get ticket by ID
  async getTicketById(customerId: string, ticketId: string): Promise<any> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, customer_id: customerId },
      relations: ['history'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      sla_due_date: ticket.sla_due_date,
      history: ticket.history.map((h) => ({
        action: h.action,
        notes: h.notes,
        created_at: h.created_at,
        created_by: h.created_by,
      })),
    };
  }
}
