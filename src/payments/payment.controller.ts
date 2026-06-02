import { Controller, Post, Body, Get, Param, UseGuards, Req, Query, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { PaymentStatus } from './payment-attempt.entity';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('gateways')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getAvailableGateways() {
    return {
      gateways: this.paymentService.getAvailableGateways(),
    };
  }

  @Post(':gateway/initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async initiatePayment(
    @Req() req: any,
    @Param('gateway') gateway: string,
    @Body() paymentData: {
      amount: number;
      invoice_id?: string;
      callback_url?: string;
      metadata?: any;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    const customerId = req.user.userId;
    
    return this.paymentService.initiatePayment(
      tenantSchema,
      gateway,
      customerId,
      paymentData.amount,
      paymentData.invoice_id,
      paymentData.callback_url,
      paymentData.metadata,
    );
  }

  @Post(':gateway/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async verifyPayment(
    @Req() req: any,
    @Param('gateway') gateway: string,
    @Body() verificationData: {
      gateway_tx_id: string;
      payment_data: any;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    
    return this.paymentService.verifyPayment(
      tenantSchema,
      gateway,
      verificationData.gateway_tx_id,
      verificationData.payment_data,
    );
  }

  @Post(':gateway/webhook')
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers('x-signature') signature?: string,
  ) {
    // Extract tenant from domain or other context
    // In a real system, this would be more sophisticated
    const tenantSchema = 'public'; // Default for webhooks
    
    return this.paymentService.handleWebhook(
      tenantSchema,
      gateway,
      payload,
      signature,
    );
  }

  @Get('attempts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getPaymentAttempt(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.paymentService.getPaymentAttempt(tenantSchema, id);
  }

  @Get('customers/:customerId/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getPaymentAttemptsByCustomer(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.paymentService.getPaymentAttemptsByCustomer(tenantSchema, customerId);
  }

  @Get('attempts/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getPaymentAttemptsByStatus(
    @Req() req: any,
    @Param('status') status: PaymentStatus,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.paymentService.getPaymentAttemptsByStatus(tenantSchema, status);
  }
}
