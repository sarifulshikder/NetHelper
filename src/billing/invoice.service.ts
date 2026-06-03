// @ts-nocheck
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Invoice, PaymentStatus } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
  ) {}

  async createInvoice(
    schemaName: string,
    invoiceData: {
      customer_id: string;
      items: Array<{
        description: string;
        unit_price: number;
        quantity: number;
        service_plan_id?: string;
        product_id?: string;
      }>;
      tax_percentage?: number;
      discount_amount?: number;
      due_date: Date;
      billing_period_start: Date;
      billing_period_end: Date;
      notes?: string;
    },
  ): Promise<Invoice> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Calculate totals
      const subtotal = invoiceData.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );

      const taxAmount = invoiceData.tax_percentage
        ? subtotal * (invoiceData.tax_percentage / 100)
        : 0;

      const discountAmount = invoiceData.discount_amount || 0;
      const netAmount = subtotal + taxAmount - discountAmount;

      // Create invoice
      const invoice = connection.manager.create(Invoice, {
        customer_id: invoiceData.customer_id,
        total_amount: subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
        due_date: invoiceData.due_date,
        billing_period_start: invoiceData.billing_period_start,
        billing_period_end: invoiceData.billing_period_end,
        payment_status: PaymentStatus.UNPAID,
        notes: invoiceData.notes,
      });

      const savedInvoice = await connection.manager.save(Invoice, invoice);

      // Create invoice items
      for (const item of invoiceData.items) {
        const invoiceItem = connection.manager.create(InvoiceItem, {
          invoice_id: savedInvoice.id,
          description: item.description,
          unit_price: item.unit_price,
          quantity: item.quantity,
          total: item.unit_price * item.quantity,
          service_plan_id: item.service_plan_id,
          product_id: item.product_id,
        });

        await connection.manager.save(InvoiceItem, invoiceItem);
      }

      return savedInvoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice: ${error.message}`);
      throw error;
    }
  }

  async getInvoiceById(schemaName: string, id: string): Promise<Invoice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const invoice = await connection.manager.findOne(Invoice, {
        where: { id },
        relations: ['items'],
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to get invoice: ${error.message}`);
      throw error;
    }
  }

  async getInvoicesByCustomerId(
    schemaName: string,
    customerId: string,
  ): Promise<Invoice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Invoice, {
        where: { customer_id: customerId },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get invoices by customer: ${error.message}`);
      throw error;
    }
  }

  async getAllInvoices(schemaName: string): Promise<Invoice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Invoice, {
        relations: ['items'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get all invoices: ${error.message}`);
      throw error;
    }
  }

  async updateInvoicePaymentStatus(
    schemaName: string,
    id: string,
    status: PaymentStatus,
    paymentData?: {
      payment_date?: Date;
      payment_method?: string;
      transaction_reference?: string;
    },
  ): Promise<Invoice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const invoice = await connection.manager.findOne(Invoice, {
        where: { id },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      invoice.payment_status = status;

      if (paymentData) {
        invoice.payment_date = paymentData.payment_date || new Date();
        invoice.payment_method = paymentData.payment_method;
        invoice.transaction_reference = paymentData.transaction_reference;
      }

      return await connection.manager.save(Invoice, invoice);
    } catch (error) {
      this.logger.error(`Failed to update invoice payment status: ${error.message}`);
      throw error;
    }
  }

  async markInvoiceAsPaid(
    schemaName: string,
    id: string,
    paymentData: {
      payment_method: string;
      transaction_reference: string;
    },
  ): Promise<Invoice> {
    return this.updateInvoicePaymentStatus(schemaName, id, PaymentStatus.PAID, {
      ...paymentData,
      payment_date: new Date(),
    });
  }

  async markInvoiceAsOverdue(schemaName: string, id: string): Promise<Invoice> {
    return this.updateInvoicePaymentStatus(schemaName, id, PaymentStatus.OVERDUE);
  }

  async getInvoicesByStatus(
    schemaName: string,
    status: PaymentStatus,
  ): Promise<Invoice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Invoice, {
        where: { payment_status: status },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get invoices by status: ${error.message}`);
      throw error;
    }
  }

  async getOverdueInvoices(schemaName: string): Promise<Invoice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();
      return await connection.manager
        .createQueryBuilder(Invoice, 'invoice')
        .where('invoice.payment_status IN (:...statuses)', {
          statuses: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
        })
        .andWhere('invoice.due_date < :now', { now })
        .getMany();
    } catch (error) {
      this.logger.error(`Failed to get overdue invoices: ${error.message}`);
      throw error;
    }
  }

  async calculateInvoiceTotals(
    items: Array<{ unit_price: number; quantity: number }>,
    taxPercentage: number = 0,
    discountAmount: number = 0,
  ): Promise<{
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    netAmount: number;
  }> {
    const subtotal = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    const taxAmount = subtotal * (taxPercentage / 100);
    const netAmount = subtotal + taxAmount - discountAmount;

    return {
      subtotal,
      taxAmount,
      discountAmount,
      netAmount,
    };
  }
}
