// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { PaymentAttempt, PaymentStatus } from './payment-attempt.entity';
import { PaymentGateway } from './payment-gateway.interface';
import { BkashGateway } from './gateways/bkash.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { WalletService } from '../wallet/wallet.service';
import { InvoiceService } from '../billing/invoice.service';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly gateways: Record<string, PaymentGateway> = {};

  constructor(
    @InjectRepository(PaymentAttempt)
    private paymentAttemptRepository: Repository<PaymentAttempt>,
    private readonly bkashGateway: BkashGateway,
    private readonly stripeGateway: StripeGateway,
    private readonly walletService: WalletService,
    private readonly invoiceService: InvoiceService,
  ) {
    this.gateways['bkash'] = this.bkashGateway;
    this.gateways['stripe'] = this.stripeGateway;
  }

  getAvailableGateways(): string[] {
    return Object.keys(this.gateways);
  }

  getGateway(name: string): PaymentGateway {
    const gateway = this.gateways[name.toLowerCase()];
    if (!gateway) {
      throw new NotFoundException(`Payment gateway ${name} not found`);
    }
    return gateway;
  }

  async initiatePayment(
    schemaName: string,
    gatewayName: string,
    customerId: string,
    amount: number,
    invoiceId?: string,
    callbackUrl?: string,
    metadata?: any,
  ): Promise<{
    success: boolean;
    paymentUrl?: string;
    paymentAttempt?: PaymentAttempt;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const gateway = this.getGateway(gatewayName);
      
      const result = await gateway.initiatePayment(
        customerId,
        amount,
        invoiceId,
        callbackUrl,
        metadata,
      );

      if (result.success && result.paymentAttempt) {
        // Save payment attempt to database
        const paymentAttempt = connection.manager.create(PaymentAttempt, {
          ...result.paymentAttempt,
          customer_id: customerId,
          invoice_id: invoiceId,
          gateway_name: gatewayName,
          amount,
          status: PaymentStatus.PENDING,
          metadata,
        });

        await connection.manager.save(PaymentAttempt, paymentAttempt);
        result.paymentAttempt = paymentAttempt;
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to initiate payment: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(
    schemaName: string,
    gatewayName: string,
    gatewayTxId: string,
    paymentData: any,
  ): Promise<{
    success: boolean;
    paymentAttempt?: PaymentAttempt;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const gateway = this.getGateway(gatewayName);
      
      // Verify payment with gateway
      const verification = await gateway.verifyPayment(gatewayTxId, paymentData);

      if (!verification.success) {
        return { success: false, error: verification.error || 'Payment verification failed' };
      }

      // Find and update payment attempt
      const paymentAttempt = await connection.manager.findOne(PaymentAttempt, {
        where: { gateway_tx_id: gatewayTxId },
      });

      if (!paymentAttempt) {
        return { success: false, error: 'Payment attempt not found' };
      }

      // Update payment attempt status
      paymentAttempt.status = PaymentStatus.SUCCESS;
      paymentAttempt.gateway_response = paymentData;
      await connection.manager.save(PaymentAttempt, paymentAttempt);

      // Process successful payment
      await this.processSuccessfulPayment(
        schemaName,
        paymentAttempt.customer_id,
        paymentAttempt.invoice_id,
        paymentAttempt.amount,
        gatewayTxId,
      );

      return { success: true, paymentAttempt };
    } catch (error) {
      this.logger.error(`Failed to verify payment: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleWebhook(
    schemaName: string,
    gatewayName: string,
    payload: any,
    signature?: string,
  ): Promise<{
    success: boolean;
    paymentAttempt?: PaymentAttempt;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const gateway = this.getGateway(gatewayName);
      
      const result = await gateway.handleWebhook(payload, signature);

      if (!result.success || !result.paymentAttempt) {
        return { success: false, error: result.error || 'Webhook processing failed' };
      }

      // Update payment attempt status
      const paymentAttempt = await connection.manager.findOne(PaymentAttempt, {
        where: { gateway_tx_id: result.paymentAttempt.gateway_tx_id },
      });

      if (paymentAttempt) {
        paymentAttempt.status = PaymentStatus.SUCCESS;
        paymentAttempt.gateway_response = payload;
        await connection.manager.save(PaymentAttempt, paymentAttempt);

        // Process successful payment
        await this.processSuccessfulPayment(
          schemaName,
          paymentAttempt.customer_id,
          paymentAttempt.invoice_id,
          paymentAttempt.amount,
          result.paymentAttempt.gateway_tx_id,
        );
      }

      return { success: true, paymentAttempt };
    } catch (error) {
      this.logger.error(`Failed to handle webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async processSuccessfulPayment(
    schemaName: string,
    customerId: string,
    invoiceId: string,
    amount: number,
    gatewayTxId: string,
  ): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      if (invoiceId) {
        // Mark invoice as paid
        await this.invoiceService.markInvoiceAsPaid(schemaName, invoiceId, {
          payment_method: `gateway_${gatewayTxId}`,
          transaction_reference: gatewayTxId,
        });
      } else {
        // Credit wallet
        await this.walletService.creditWallet(
          schemaName,
          customerId,
          amount,
          `Payment gateway deposit: ${gatewayTxId}`,
          gatewayTxId,
          'gateway',
        );
      }

      this.logger.log(
        `Processed successful payment: ${gatewayTxId} for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process successful payment: ${error.message}`,
      );
      throw error;
    }
  }

  async getPaymentAttempt(
    schemaName: string,
    id: string,
  ): Promise<PaymentAttempt> {
    const connection = await getTenantConnection(schemaName);

    try {
      const paymentAttempt = await connection.manager.findOne(PaymentAttempt, {
        where: { id },
      });

      if (!paymentAttempt) {
        throw new NotFoundException('Payment attempt not found');
      }

      return paymentAttempt;
    } catch (error) {
      this.logger.error(`Failed to get payment attempt: ${error.message}`);
      throw error;
    }
  }

  async getPaymentAttemptsByCustomer(
    schemaName: string,
    customerId: string,
  ): Promise<PaymentAttempt[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(PaymentAttempt, {
        where: { customer_id: customerId },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get payment attempts by customer: ${error.message}`,
      );
      throw error;
    }
  }

  async getPaymentAttemptsByStatus(
    schemaName: string,
    status: PaymentStatus,
  ): Promise<PaymentAttempt[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(PaymentAttempt, {
        where: { status },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get payment attempts by status: ${error.message}`,
      );
      throw error;
    }
  }
}
