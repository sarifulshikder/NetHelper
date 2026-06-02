import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { InvoiceService } from './invoice.service';
import { Invoice, PaymentStatus } from './invoice.entity';
import { TenantService } from '../tenants/tenant.service';
import { RadiusService } from '../radius/radius.service';
import { MikrotikService } from '../network/mikrotik.service';
import { User } from '../users/user.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly tenantService: TenantService,
    private readonly radiusService: RadiusService,
    private readonly mikrotikService: MikrotikService,
  ) {}

  // Tenant-specific billing configuration (could be stored in database in production)
  private tenantBillingConfigs: Record<string, {
    taxPercentage: number;
    billingCycle: 'monthly' | 'annual';
    defaultDueDays: number;
  }> = {};

  async setTenantBillingConfig(
    tenantId: string,
    config: {
      taxPercentage: number;
      billingCycle: 'monthly' | 'annual';
      defaultDueDays: number;
    },
  ): Promise<void> {
    this.tenantBillingConfigs[tenantId] = config;
  }

  async getTenantBillingConfig(tenantId: string): Promise<any> {
    return this.tenantBillingConfigs[tenantId] || {
      taxPercentage: 15, // Default 15% VAT
      billingCycle: 'monthly',
      defaultDueDays: 15,
    };
  }

  async generateRecurringInvoicesForTenant(schemaName: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Get all active customers (in a real system, this would be from a Customer entity)
      // For now, we'll use the User entity with role 'customer'
      const customers = await connection.manager.find(User, {
        where: { role: 'customer', status: true },
      });

      const config = this.tenantBillingConfigs[schemaName] || {
        taxPercentage: 15,
        defaultDueDays: 15,
      };

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Calculate billing period
      const billingPeriodStart = new Date(currentYear, currentMonth, 1);
      const billingPeriodEnd = new Date(currentYear, currentMonth + 1, 0);
      const dueDate = new Date(currentYear, currentMonth, config.defaultDueDays);

      for (const customer of customers) {
        // In a real system, we would get the customer's service plan and calculate accordingly
        // For this example, we'll use a fixed monthly fee
        const monthlyFee = 1000; // Example: 1000 BDT/month

        // Create invoice
        await this.invoiceService.createInvoice(schemaName, {
          customer_id: customer.id,
          items: [
            {
              description: 'Monthly Internet Service Subscription',
              unit_price: monthlyFee,
              quantity: 1,
              service_plan_id: 'basic_plan', // Would be dynamic in real system
            },
          ],
          tax_percentage: config.taxPercentage,
          due_date: dueDate,
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          notes: 'Automatically generated recurring invoice',
        });

        this.logger.log(
          `Generated invoice for customer ${customer.id} in tenant ${schemaName}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate recurring invoices for tenant ${schemaName}: ${error.message}`,
      );
      throw error;
    }
  }

  // Cron job to generate recurring invoices daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringBilling() {
    this.logger.log('Starting daily recurring billing job...');

    try {
      // Get all active tenants
      const tenants = await this.tenantService.findAllTenants();

      for (const tenant of tenants) {
        if (tenant.status) {
          try {
            this.logger.log(
              `Processing recurring billing for tenant: ${tenant.name}`,
            );
            await this.generateRecurringInvoicesForTenant(tenant.schema_name);
          } catch (error) {
            this.logger.error(
              `Failed to process billing for tenant ${tenant.name}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log('Recurring billing job completed');
    } catch (error) {
      this.logger.error(`Recurring billing job failed: ${error.message}`);
    }
  }

  // Cron job to check for overdue invoices and trigger suspensions
  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueInvoices() {
    this.logger.log('Starting overdue invoice check job...');

    try {
      // Get all active tenants
      const tenants = await this.tenantService.findAllTenants();

      for (const tenant of tenants) {
        if (tenant.status) {
          try {
            this.logger.log(
              `Checking overdue invoices for tenant: ${tenant.name}`,
            );
            await this.checkAndHandleOverdueInvoices(tenant.schema_name);
          } catch (error) {
            this.logger.error(
              `Failed to check overdue invoices for tenant ${tenant.name}: ${error.message}`,
            );
          }
        }
      }

      this.logger.log('Overdue invoice check job completed');
    } catch (error) {
      this.logger.error(`Overdue invoice check job failed: ${error.message}`);
    }
  }

  async checkAndHandleOverdueInvoices(schemaName: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Get overdue invoices
      const overdueInvoices = await this.invoiceService.getOverdueInvoices(
        schemaName,
      );

      for (const invoice of overdueInvoices) {
        // Mark as overdue if not already
        if (invoice.payment_status !== PaymentStatus.OVERDUE) {
          await this.invoiceService.markInvoiceAsOverdue(
            schemaName,
            invoice.id,
          );
        }

        // Trigger suspension for the customer
        // In a real system, we would have a Customer entity with suspension status
        // For now, we'll simulate by calling RADIUS to disable the user
        try {
          // Get the customer's RADIUS username (would be from Customer entity in real system)
          // For this example, we'll assume it's the same as customer_id
          const radiusUsername = invoice.customer_id;

          // Disable the user in RADIUS
          await this.radiusService.updateUserStatus(
            schemaName,
            radiusUsername,
            false, // Disable the user
          );

          this.logger.log(
            `Suspended customer ${radiusUsername} due to overdue invoice ${invoice.id}`,
          );

          // Optionally, send PoD to MikroTik to disconnect active sessions
          // This would require NAS IP and port configuration in a real system
          // await this.mikrotikService.disconnectUser(nasIp, nasPort, radiusUsername);
        } catch (error) {
          this.logger.error(
            `Failed to suspend customer ${invoice.customer_id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle overdue invoices for tenant ${schemaName}: ${error.message}`,
      );
      throw error;
    }
  }

  async applyDiscountToInvoice(
    schemaName: string,
    invoiceId: string,
    discountAmount: number,
  ): Promise<Invoice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const invoice = await connection.manager.findOne(Invoice, {
        where: { id: invoiceId },
      });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Recalculate net amount with new discount
      const newNetAmount = invoice.total_amount + invoice.tax_amount - discountAmount;

      invoice.discount_amount = discountAmount;
      invoice.net_amount = newNetAmount;

      return await connection.manager.save(Invoice, invoice);
    } catch (error) {
      this.logger.error(`Failed to apply discount: ${error.message}`);
      throw error;
    }
  }

  async applyTaxToInvoice(
    schemaName: string,
    invoiceId: string,
    taxPercentage: number,
  ): Promise<Invoice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const invoice = await connection.manager.findOne(Invoice, {
        where: { id: invoiceId },
      });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Recalculate tax and net amount
      const newTaxAmount = invoice.total_amount * (taxPercentage / 100);
      const newNetAmount = 
        invoice.total_amount + newTaxAmount - invoice.discount_amount;

      invoice.tax_amount = newTaxAmount;
      invoice.net_amount = newNetAmount;

      return await connection.manager.save(Invoice, invoice);
    } catch (error) {
      this.logger.error(`Failed to apply tax: ${error.message}`);
      throw error;
    }
  }

  async findAllTenants(): Promise<any[]> {
    // This would be replaced with actual tenant service call
    return [];
  }
}
