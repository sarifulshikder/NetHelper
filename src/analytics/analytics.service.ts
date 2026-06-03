// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThan, LessThan } from 'typeorm';
import { Invoice, InvoiceStatus } from '../billing/invoice.entity';
import { InvoiceItem } from '../billing/invoice-item.entity';
import { Customer } from '../crm/customer.entity';
import { Lead, LeadStatus } from '../crm/lead.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { TicketHistory } from '../tickets/ticket-history.entity';
import { WalletTransaction, WalletTransactionType } from '../wallet/wallet-transaction.entity';
import { PaymentAttempt } from '../payments/payment-attempt.entity';
import { CorporateAccount } from '../enterprise/entities/corporate-account.entity';
import { CorporateBranch } from '../enterprise/entities/corporate-branch.entity';

interface ExecutiveOverviewMetrics {
  financials: {
    mrr: number;
    current_month_revenue: number;
    total_unpaid_amount: number;
    total_overdue_amount: number;
    total_revenue_collected: number;
  };
  subscriptions: {
    total_active_customers: number;
    new_customers_this_month: number;
    suspended_accounts: number;
    churn_rate_percentage: number;
    lead_conversion_rate: number;
  };
  operations: {
    open_tickets: number;
    avg_resolution_time_hours: number;
    sla_breach_rate: number;
    total_tickets_resolved: number;
  };
}

interface TimeSeriesDataPoint {
  period: string;
  revenue_generated: number;
  revenue_collected: number;
  new_customers: number;
}

interface FinancialExportData {
  invoices: any[];
  payments: any[];
  wallet_transactions: any[];
  total_amount: number;
  period: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private ticketHistoryRepository: Repository<TicketHistory>,
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(PaymentAttempt)
    private paymentAttemptRepository: Repository<PaymentAttempt>,
    @InjectRepository(CorporateAccount)
    private corporateAccountRepository: Repository<CorporateAccount>,
    @InjectRepository(CorporateBranch)
    private corporateBranchRepository: Repository<CorporateBranch>,
    private dataSource: DataSource,
  ) {}

  // Get executive overview metrics
  async getExecutiveOverviewMetrics(): Promise<ExecutiveOverviewMetrics> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Financial metrics
    const mrr = await this.calculateMRR();
    const currentMonthRevenue = await this.calculateCurrentMonthRevenue();
    const totalUnpaid = await this.calculateTotalUnpaidAmount();
    const totalOverdue = await this.calculateTotalOverdueAmount();
    const totalRevenueCollected = await this.calculateTotalRevenueCollected();

    // Subscription metrics
    const totalActiveCustomers = await this.customerRepository.count({
      where: { is_active: true },
    });

    const newCustomersThisMonth = await this.customerRepository.count({
      where: {
        activation_date: Between(currentMonthStart, currentMonthEnd),
      },
    });

    const suspendedAccounts = await this.customerRepository.count({
      where: { is_active: false },
    });

    const churnRate = await this.calculateChurnRate(lastMonthStart, lastMonthEnd);
    const leadConversionRate = await this.calculateLeadConversionRate();

    // Operations metrics
    const openTickets = await this.ticketRepository.count({
      where: {
        status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
      },
    });

    const avgResolutionTime = await this.calculateAverageResolutionTime();
    const slaBreachRate = await this.calculateSlaBreachRate();
    const totalTicketsResolved = await this.ticketRepository.count({
      where: { status: TicketStatus.RESOLVED },
    });

    return {
      financials: {
        mrr,
        current_month_revenue: currentMonthRevenue,
        total_unpaid_amount: totalUnpaid,
        total_overdue_amount: totalOverdue,
        total_revenue_collected: totalRevenueCollected,
      },
      subscriptions: {
        total_active_customers: totalActiveCustomers,
        new_customers_this_month: newCustomersThisMonth,
        suspended_accounts: suspendedAccounts,
        churn_rate_percentage: churnRate,
        lead_conversion_rate: leadConversionRate,
      },
      operations: {
        open_tickets: openTickets,
        avg_resolution_time_hours: avgResolutionTime,
        sla_breach_rate: slaBreachRate,
        total_tickets_resolved: totalTicketsResolved,
      },
    };
  }

  // Calculate Monthly Recurring Revenue (MRR)
  private async calculateMRR(): Promise<number> {
    const activeCustomers = await this.customerRepository.find({
      where: { is_active: true },
      relations: ['invoices'],
    });

    // For simplicity, we'll use the average of the last 3 paid invoices per customer
    // In a real system, this would be based on subscription plans
    let totalMRR = 0;

    for (const customer of activeCustomers) {
      const paidInvoices = customer.invoices
        .filter((inv) => inv.status === InvoiceStatus.PAID)
        .sort((a, b) => b.invoice_date.getTime() - a.invoice_date.getTime())
        .slice(0, 3);

      if (paidInvoices.length > 0) {
        const avgInvoiceAmount =
          paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0) /
          paidInvoices.length;
        totalMRR += avgInvoiceAmount;
      }
    }

    return parseFloat(totalMRR.toFixed(2));
  }

  // Calculate current month revenue
  private async calculateCurrentMonthRevenue(): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const invoices = await this.invoiceRepository.find({
      where: {
        invoice_date: Between(monthStart, monthEnd),
        status: InvoiceStatus.PAID,
      },
    });

    return invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  }

  // Calculate total unpaid amount
  private async calculateTotalUnpaidAmount(): Promise<number> {
    const invoices = await this.invoiceRepository.find({
      where: {
        status: InvoiceStatus.UNPAID,
        due_date: MoreThan(new Date()), // Not yet overdue
      },
    });

    return invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  }

  // Calculate total overdue amount
  private async calculateTotalOverdueAmount(): Promise<number> {
    const invoices = await this.invoiceRepository.find({
      where: {
        status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]),
        due_date: LessThan(new Date()), // Past due date
      },
    });

    return invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
  }

  // Calculate total revenue collected
  private async calculateTotalRevenueCollected(): Promise<number> {
    const payments = await this.paymentAttemptRepository.find({
      where: { status: 'SUCCESS' },
    });

    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  // Calculate churn rate
  private async calculateChurnRate(startDate: Date, endDate: Date): Promise<number> {
    // Customers active at the start of the period
    const activeAtStart = await this.customerRepository.count({
      where: {
        activation_date: LessThan(endDate),
        deactivation_date: MoreThan(startDate),
      },
    });

    // Customers who churned during the period
    const churned = await this.customerRepository.count({
      where: {
        deactivation_date: Between(startDate, endDate),
      },
    });

    if (activeAtStart === 0) return 0;
    return parseFloat(((churned / activeAtStart) * 100).toFixed(2));
  }

  // Calculate lead conversion rate
  private async calculateLeadConversionRate(): Promise<number> {
    const totalLeads = await this.leadRepository.count();
    if (totalLeads === 0) return 0;

    const convertedLeads = await this.leadRepository.count({
      where: { status: LeadStatus.CONVERTED },
    });

    return parseFloat(((convertedLeads / totalLeads) * 100).toFixed(2));
  }

  // Calculate average ticket resolution time
  private async calculateAverageResolutionTime(): Promise<number> {
    const resolvedTickets = await this.ticketRepository.find({
      where: { status: TicketStatus.RESOLVED },
      relations: ['history'],
    });

    if (resolvedTickets.length === 0) return 0;

    let totalHours = 0;
    let count = 0;

    for (const ticket of resolvedTickets) {
      const createdAt = ticket.created_at.getTime();
      const resolvedAt = ticket.history
        .filter((h) => h.action === 'RESOLVED')
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]?.created_at;

      if (resolvedAt) {
        const diffMs = resolvedAt.getTime() - createdAt.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        totalHours += diffHours;
        count++;
      }
    }

    return count > 0 ? parseFloat((totalHours / count).toFixed(2)) : 0;
  }

  // Calculate SLA breach rate
  private async calculateSlaBreachRate(): Promise<number> {
    const resolvedTickets = await this.ticketRepository.find({
      where: { status: TicketStatus.RESOLVED },
      relations: ['history'],
    });

    if (resolvedTickets.length === 0) return 0;

    let breachCount = 0;

    for (const ticket of resolvedTickets) {
      if (ticket.sla_due_date && ticket.history.length > 0) {
        const resolvedAt = ticket.history
          .filter((h) => h.action === 'RESOLVED')
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]?.created_at;

        if (resolvedAt && resolvedAt > ticket.sla_due_date) {
          breachCount++;
        }
      }
    }

    return parseFloat(((breachCount / resolvedTickets.length) * 100).toFixed(2));
  }

  // Get time-series revenue trends
  async getRevenueTrends(months: number = 6): Promise<TimeSeriesDataPoint[]> {
    const trends: TimeSeriesDataPoint[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });

      // Revenue generated (invoices created)
      const generated = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select('SUM(invoice.total_amount)', 'total')
        .where('invoice.invoice_date BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        })
        .getRawOne();

      // Revenue collected (payments received)
      const collected = await this.paymentAttemptRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.created_at BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        })
        .andWhere('payment.status = :status', { status: 'SUCCESS' })
        .getRawOne();

      // New customers
      const newCustomers = await this.customerRepository.count({
        where: {
          activation_date: Between(monthStart, monthEnd),
        },
      });

      trends.push({
        period: monthName,
        revenue_generated: parseFloat(generated?.total || '0'),
        revenue_collected: parseFloat(collected?.total || '0'),
        new_customers: newCustomers,
      });
    }

    return trends;
  }

  // Get ticket performance metrics
  async getTicketPerformanceMetrics(): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ticket status distribution
    const statusDistribution = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(ticket.id)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    // Resolution time by category
    const resolutionTimeByCategory = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.category', 'category')
      .addSelect('AVG(EXTRACT(EPOCH FROM (th.created_at - ticket.created_at)) / 3600)', 'avg_hours')
      .leftJoin(
        (qb) => {
          return qb
            .from(TicketHistory, 'th')
            .select(['th.ticket_id', 'MAX(th.created_at) as created_at'])
            .where('th.action = :action', { action: 'RESOLVED' })
            .groupBy('th.ticket_id');
        },
        'th',
        'th.ticket_id = ticket.id',
      )
      .where('ticket.status = :status', { status: TicketStatus.RESOLVED })
      .groupBy('ticket.category')
      .getRawMany();

    // SLA compliance by priority
    const slaComplianceByPriority = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.priority', 'priority')
      .addSelect('COUNT(ticket.id)', 'total')
      .addSelect(
        'SUM(CASE WHEN th.created_at <= ticket.sla_due_date THEN 1 ELSE 0 END)',
        'compliant',
      )
      .leftJoin(
        (qb) => {
          return qb
            .from(TicketHistory, 'th')
            .select(['th.ticket_id', 'MAX(th.created_at) as created_at'])
            .where('th.action = :action', { action: 'RESOLVED' })
            .groupBy('th.ticket_id');
        },
        'th',
        'th.ticket_id = ticket.id',
      )
      .where('ticket.status = :status', { status: TicketStatus.RESOLVED })
      .andWhere('ticket.sla_due_date IS NOT NULL')
      .groupBy('ticket.priority')
      .getRawMany();

    // Average tickets per day this month
    const ticketsThisMonth = await this.ticketRepository.count({
      where: { created_at: MoreThan(monthStart) },
    });

    const daysInMonth = now.getDate();
    const avgTicketsPerDay = daysInMonth > 0 ? ticketsThisMonth / daysInMonth : 0;

    return {
      status_distribution: statusDistribution,
      resolution_time_by_category: resolutionTimeByCategory,
      sla_compliance_by_priority: slaComplianceByPriority.map((item) => ({
        priority: item.priority,
        total: parseInt(item.total),
        compliant: parseInt(item.compliant),
        compliance_rate: item.total > 0 ? (item.compliant / item.total) * 100 : 0,
      })),
      avg_tickets_per_day: parseFloat(avgTicketsPerDay.toFixed(2)),
      tickets_created_this_month: ticketsThisMonth,
    };
  }

  // Export financial data
  async exportFinancialData(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialExportData> {
    // Get invoices
    const invoices = await this.invoiceRepository.find({
      where: {
        invoice_date: Between(startDate, endDate),
      },
      relations: ['items'],
    });

    // Get payments
    const payments = await this.paymentAttemptRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
    });

    // Get wallet transactions
    const walletTransactions = await this.walletTransactionRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
    });

    // Calculate total amount
    const totalAmount =
      invoices.reduce((sum, inv) => sum + inv.total_amount, 0) +
      payments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        date: inv.invoice_date,
        due_date: inv.due_date,
        customer_id: inv.customer_id,
        total_amount: inv.total_amount,
        status: inv.status,
        items: inv.items.map((item) => ({
          description: item.description,
          amount: item.amount,
        })),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        gateway: payment.gateway,
        status: payment.status,
        reference: payment.reference,
        created_at: payment.created_at,
      })),
      wallet_transactions: walletTransactions.map((tx) => ({
        id: tx.id,
        wallet_id: tx.wallet_id,
        amount: tx.amount,
        type: tx.type,
        reference: tx.reference,
        created_at: tx.created_at,
      })),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    };
  }

  // Get customer acquisition metrics
  async getCustomerAcquisitionMetrics(): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Customer acquisition by source (simulated)
    const acquisitionBySource = [
      { source: 'Online', count: 45 },
      { source: 'Referral', count: 25 },
      { source: 'Field Sales', count: 20 },
      { source: 'Partnerships', count: 10 },
    ];

    // Customer segmentation
    const segmentation = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.service_plan', 'segment')
      .addSelect('COUNT(customer.id)', 'count')
      .groupBy('customer.service_plan')
      .getRawMany();

    // Revenue by customer segment
    const revenueBySegment = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('customer.service_plan', 'segment')
      .addSelect('SUM(invoice.total_amount)', 'revenue')
      .leftJoin('invoice.customer', 'customer')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .groupBy('customer.service_plan')
      .getRawMany();

    // Customer lifetime value simulation
    const avgCustomerLifetime = 24; // months
    const avgMonthlyRevenuePerCustomer = await this.calculateMRR() / (await this.customerRepository.count());
    const avgLtv = avgCustomerLifetime * avgMonthlyRevenuePerCustomer;

    return {
      acquisition_by_source: acquisitionBySource,
      customer_segmentation: segmentation,
      revenue_by_segment: revenueBySegment,
      avg_customer_ltv: parseFloat(avgLtv.toFixed(2)),
      avg_monthly_revenue_per_customer: parseFloat(avgMonthlyRevenuePerCustomer.toFixed(2)),
    };
  }

  // Get operational efficiency metrics
  async getOperationalEfficiencyMetrics(): Promise<any> {
    // Technician productivity
    const technicianProductivity = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.assigned_to_staff_id', 'technician_id')
      .addSelect('COUNT(ticket.id)', 'tickets_resolved')
      .addSelect('AVG(EXTRACT(EPOCH FROM (th.created_at - ticket.created_at)) / 3600)', 'avg_resolution_hours')
      .leftJoin(
        (qb) => {
          return qb
            .from(TicketHistory, 'th')
            .select(['th.ticket_id', 'MAX(th.created_at) as created_at'])
            .where('th.action = :action', { action: 'RESOLVED' })
            .groupBy('th.ticket_id');
        },
        'th',
        'th.ticket_id = ticket.id',
      )
      .where('ticket.status = :status', { status: TicketStatus.RESOLVED })
      .andWhere('ticket.assigned_to_staff_id IS NOT NULL')
      .groupBy('ticket.assigned_to_staff_id')
      .getRawMany();

    // First response time
    const firstResponseTime = await this.ticketHistoryRepository
      .createQueryBuilder('history')
      .select('AVG(EXTRACT(EPOCH FROM (history.created_at - ticket.created_at)) / 3600)', 'avg_hours')
      .leftJoin('history.ticket', 'ticket')
      .where('history.action = :action', { action: 'IN_PROGRESS' })
      .getRawOne();

    // Ticket reopen rate
    const totalResolved = await this.ticketRepository.count({
      where: { status: TicketStatus.RESOLVED },
    });

    const reopened = await this.ticketHistoryRepository
      .createQueryBuilder('history')
      .select('COUNT(DISTINCT history.ticket_id)', 'count')
      .where('history.action = :action', { action: 'REOPENED' })
      .getRawOne();

    const reopenRate = totalResolved > 0 ? (parseInt(reopened?.count || '0') / totalResolved) * 100 : 0;

    return {
      technician_productivity: technicianProductivity.map((item) => ({
        technician_id: item.technician_id,
        tickets_resolved: parseInt(item.tickets_resolved),
        avg_resolution_hours: parseFloat(item.avg_resolution_hours),
      })),
      first_response_time_hours: parseFloat(firstResponseTime?.avg_hours || '0'),
      ticket_reopen_rate: parseFloat(reopenRate.toFixed(2)),
      total_tickets_resolved: totalResolved,
    };
  }
}
