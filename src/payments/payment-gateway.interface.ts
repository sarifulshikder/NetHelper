import { PaymentAttempt } from './payment-attempt.entity';

export interface PaymentGateway {
  getName(): string;

  initiatePayment(
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
  }>;

  verifyPayment(
    gatewayTxId: string,
    paymentData: any,
  ): Promise<{
    success: boolean;
    amount?: number;
    transactionId?: string;
    error?: string;
  }>;

  handleWebhook(
    payload: any,
    signature?: string,
  ): Promise<{
    success: boolean;
    paymentAttempt?: PaymentAttempt;
    error?: string;
  }>;

  generateSignature(data: any, secret: string): string;

  validateSignature(data: any, signature: string, secret: string): boolean;
}
