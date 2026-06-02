import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway } from '../payment-gateway.interface';
import { PaymentAttempt, PaymentStatus } from '../payment-attempt.entity';
import * as crypto from 'crypto';

@Injectable()
export class StripeGateway implements PaymentGateway {
  private readonly logger = new Logger(StripeGateway.name);
  private readonly config = {
    secretKey: 'sk_test_1234567890',
    webhookSecret: 'whsec_1234567890',
    apiVersion: '2023-10-16',
  };

  getName(): string {
    return 'stripe';
  }

  async initiatePayment(
    customerId: string,
    amount: number,
    invoiceId?: string,
    callbackUrl?: string,
    metadata?: any,
  ): Promise<{
    success: boolean;
    paymentUrl?: string;
    gatewayTxId?: string;
    paymentAttempt?: PaymentAttempt;
    error?: string;
  }> {
    try {
      // Simulate Stripe payment intent creation
      const paymentIntent = await this.createPaymentIntent(
        amount,
        callbackUrl,
        metadata,
      );

      if (!paymentIntent.success) {
        return { success: false, error: paymentIntent.error };
      }

      // Create payment attempt record
      const paymentAttempt: Partial<PaymentAttempt> = {
        gateway_tx_id: paymentIntent.paymentIntentId,
        status: PaymentStatus.PENDING,
        redirect_url: paymentIntent.paymentUrl,
        callback_url: callbackUrl,
        metadata: {
          clientSecret: paymentIntent.clientSecret,
          ...metadata,
        },
        gateway_response: paymentIntent,
      };

      return {
        success: true,
        paymentUrl: paymentIntent.paymentUrl,
        gatewayTxId: paymentIntent.paymentIntentId,
        paymentAttempt: paymentAttempt as PaymentAttempt,
      };
    } catch (error) {
      this.logger.error(`Stripe payment initiation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(
    gatewayTxId: string,
    paymentData: any,
  ): Promise<{
    success: boolean;
    amount?: number;
    transactionId?: string;
    error?: string;
  }> {
    try {
      // Simulate Stripe payment verification
      const verification = await this.verifyPaymentIntent(gatewayTxId);

      if (!verification.success) {
        return { success: false, error: verification.error };
      }

      return {
        success: true,
        amount: verification.amount,
        transactionId: gatewayTxId,
      };
    } catch (error) {
      this.logger.error(`Stripe payment verification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleWebhook(
    payload: any,
    signature?: string,
  ): Promise<{
    success: boolean;
    paymentAttempt?: PaymentAttempt;
    error?: string;
  }> {
    try {
      // Validate webhook signature
      if (signature) {
        const expectedSignature = this.generateSignature(
          payload,
          this.config.webhookSecret,
        );
        if (expectedSignature !== signature) {
          return { success: false, error: 'Invalid webhook signature' };
        }
      }

      // Extract payment information from webhook
      const paymentIntentId = payload.data.object.id;
      const status = payload.data.object.status;
      const amount = payload.data.object.amount / 100; // Convert from cents

      if (status !== 'succeeded') {
        return { success: false, error: `Payment status is ${status}` };
      }

      // Create payment attempt record from webhook
      const paymentAttempt: Partial<PaymentAttempt> = {
        gateway_tx_id: paymentIntentId,
        status: PaymentStatus.SUCCESS,
        amount: amount,
        gateway_response: payload,
        metadata: {
          webhookReceived: true,
          eventType: payload.type,
        },
      };

      return {
        success: true,
        paymentAttempt: paymentAttempt as PaymentAttempt,
      };
    } catch (error) {
      this.logger.error(`Stripe webhook handling failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  generateSignature(data: any, secret: string): string {
    const dataString = JSON.stringify(data);
    return crypto
      .createHmac('sha256', secret)
      .update(dataString)
      .digest('hex');
  }

  validateSignature(data: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(data, secret);
    return expectedSignature === signature;
  }

  // Simulated Stripe API methods
  private async createPaymentIntent(
    amount: number,
    callbackUrl: string,
    metadata: any,
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    clientSecret?: string;
    paymentUrl?: string;
    error?: string;
  }> {
    // Simulate payment intent creation
    const paymentIntentId = `pi_${Math.floor(
      1000000000000000 + Math.random() * 9000000000000000,
    )}`;
    const clientSecret = `pi_${paymentIntentId}_secret_1234567890`;
    const paymentUrl = `https://checkout.stripe.com/pay/${paymentIntentId}`;

    return {
      success: true,
      paymentIntentId,
      clientSecret,
      paymentUrl,
      amount,
      callbackUrl,
      ...metadata,
    };
  }

  private async verifyPaymentIntent(
    paymentIntentId: string,
  ): Promise<{
    success: boolean;
    amount?: number;
    error?: string;
  }> {
    // Simulate payment verification
    return {
      success: true,
      amount: 100.0, // Simulated amount
    };
  }
}
