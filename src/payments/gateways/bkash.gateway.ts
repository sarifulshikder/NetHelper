import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway } from '../payment-gateway.interface';
import { PaymentAttempt, PaymentStatus } from '../payment-attempt.entity';
import * as crypto from 'crypto';

@Injectable()
export class BkashGateway implements PaymentGateway {
  private readonly logger = new Logger(BkashGateway.name);
  private readonly config = {
    baseUrl: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
    appKey: 'sandbox_app_key',
    appSecret: 'sandbox_app_secret',
    username: 'sandbox_username',
    password: 'sandbox_password',
  };

  getName(): string {
    return 'bkash';
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
      // Simulate bKash token generation
      const token = await this.generateToken();
      if (!token) {
        return { success: false, error: 'Failed to generate bKash token' };
      }

      // Simulate bKash payment creation
      const paymentResponse = await this.createPayment(
        token,
        amount,
        callbackUrl,
        metadata,
      );

      if (!paymentResponse.success) {
        return { success: false, error: paymentResponse.error };
      }

      // Create payment attempt record
      const paymentAttempt: Partial<PaymentAttempt> = {
        gateway_tx_id: paymentResponse.paymentId,
        status: PaymentStatus.PENDING,
        redirect_url: paymentResponse.paymentUrl,
        callback_url: callbackUrl,
        metadata: {
          bkashToken: token,
          ...metadata,
        },
        gateway_response: paymentResponse,
      };

      return {
        success: true,
        paymentUrl: paymentResponse.paymentUrl,
        gatewayTxId: paymentResponse.paymentId,
        paymentAttempt: paymentAttempt as PaymentAttempt,
      };
    } catch (error) {
      this.logger.error(`bKash payment initiation failed: ${error.message}`);
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
      // Simulate bKash payment verification
      const token = await this.generateToken();
      if (!token) {
        return { success: false, error: 'Failed to generate bKash token' };
      }

      // Simulate API call to verify payment
      const verificationResponse = await this.verifyPaymentWithBkash(
        token,
        gatewayTxId,
      );

      if (!verificationResponse.success) {
        return { success: false, error: verificationResponse.error };
      }

      return {
        success: true,
        amount: verificationResponse.amount,
        transactionId: gatewayTxId,
      };
    } catch (error) {
      this.logger.error(`bKash payment verification failed: ${error.message}`);
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
          this.config.appSecret,
        );
        if (expectedSignature !== signature) {
          return { success: false, error: 'Invalid webhook signature' };
        }
      }

      // Extract payment information from webhook
      const paymentId = payload.paymentID;
      const status = payload.status;
      const amount = payload.amount;

      if (status !== 'completed') {
        return { success: false, error: `Payment status is ${status}` };
      }

      // Create payment attempt record from webhook
      const paymentAttempt: Partial<PaymentAttempt> = {
        gateway_tx_id: paymentId,
        status: PaymentStatus.SUCCESS,
        amount: amount,
        gateway_response: payload,
        metadata: {
          webhookReceived: true,
        },
      };

      return {
        success: true,
        paymentAttempt: paymentAttempt as PaymentAttempt,
      };
    } catch (error) {
      this.logger.error(`bKash webhook handling failed: ${error.message}`);
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

  // Simulated bKash API methods
  private async generateToken(): Promise<string> {
    // Simulate token generation
    return 'sandbox_token_1234567890';
  }

  private async createPayment(
    token: string,
    amount: number,
    callbackUrl: string,
    metadata: any,
  ): Promise<{
    success: boolean;
    paymentId?: string;
    paymentUrl?: string;
    error?: string;
  }> {
    // Simulate payment creation
    const paymentId = `BK${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const paymentUrl = `https://sandbox.bka.sh/payment?paymentID=${paymentId}`;

    return {
      success: true,
      paymentId,
      paymentUrl,
      amount,
      callbackUrl,
      ...metadata,
    };
  }

  private async verifyPaymentWithBkash(
    token: string,
    paymentId: string,
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
