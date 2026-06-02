import { Controller, Post, Body, Get, Put, Param, UseGuards, Req, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { PaymentStatus } from './invoice.entity';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async setBillingConfig(
    @Req() req: any,
    @Body() config: {
      taxPercentage: number;
      billingCycle: 'monthly' | 'annual';
      defaultDueDays: number;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    // In a real system, we would get tenantId from the tenant service
    const tenantId = 'current_tenant'; // Would be dynamic
    await this.billingService.setTenantBillingConfig(tenantId, config);
    return { message: 'Billing configuration updated successfully' };
  }

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async getBillingConfig(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    // In a real system, we would get tenantId from the tenant service
    const tenantId = 'current_tenant'; // Would be dynamic
    return this.billingService.getTenantBillingConfig(tenantId);
  }

  @Post('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async createInvoice(@Req() req: any, @Body() invoiceData: any) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.createInvoice(tenantSchema, invoiceData);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllInvoices(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.getAllInvoices(tenantSchema);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getInvoiceById(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.getInvoiceById(tenantSchema, id);
  }

  @Get('customers/:customerId/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getInvoicesByCustomerId(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.getInvoicesByCustomerId(tenantSchema, customerId);
  }

  @Put('invoices/:id/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async markInvoiceAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() paymentData: {
      payment_method: string;
      transaction_reference: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.markInvoiceAsPaid(
      tenantSchema,
      id,
      paymentData,
    );
  }

  @Put('invoices/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateInvoiceStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: { status: PaymentStatus },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.updateInvoicePaymentStatus(
      tenantSchema,
      id,
      statusData.status,
    );
  }

  @Get('invoices/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getInvoicesByStatus(
    @Req() req: any,
    @Param('status') status: PaymentStatus,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.getInvoicesByStatus(tenantSchema, status);
  }

  @Get('invoices/overdue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOverdueInvoices(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.invoiceService.getOverdueInvoices(tenantSchema);
  }

  @Post('invoices/:id/discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async applyDiscount(
    @Req() req: any,
    @Param('id') id: string,
    @Body() discountData: { amount: number },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.billingService.applyDiscountToInvoice(
      tenantSchema,
      id,
      discountData.amount,
    );
  }

  @Post('invoices/:id/tax')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async applyTax(
    @Req() req: any,
    @Param('id') id: string,
    @Body() taxData: { percentage: number },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.billingService.applyTaxToInvoice(
      tenantSchema,
      id,
      taxData.percentage,
    );
  }

  @Post('recurring/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async generateRecurringInvoices(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    await this.billingService.generateRecurringInvoicesForTenant(tenantSchema);
    return {
      message: 'Recurring invoices generated successfully for current tenant',
    };
  }

  @Post('overdue/check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async checkOverdueInvoices(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    await this.billingService.checkAndHandleOverdueInvoices(tenantSchema);
    return {
      message: 'Overdue invoice check and suspension process completed',
    };
  }

  @Post('calculate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async calculateInvoiceTotals(
    @Body() calculationData: {
      items: Array<{ unit_price: number; quantity: number }>;
      tax_percentage?: number;
      discount_amount?: number;
    },
  ) {
    return this.invoiceService.calculateInvoiceTotals(
      calculationData.items,
      calculationData.tax_percentage || 0,
      calculationData.discount_amount || 0,
    );
  }
}
