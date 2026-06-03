// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { NotificationDriver } from './notification-driver.interface';
import { NotificationChannel } from '../entities/notification-template.entity';

@Injectable()
export class SmsDriver implements NotificationDriver {
  getChannel(): NotificationChannel {
    return NotificationChannel.SMS;
  }

  async send(
    destination: string,
    subject: string,
    body: string,
  ): Promise<{
    success: boolean;
    message: string;
    response?: any;
    error?: string;
  }> {
    // Simulate network latency (100-800ms for SMS gateways)
    const latency = Math.floor(Math.random() * 700) + 100;
    await new Promise((resolve) => setTimeout(resolve, latency));

    // Simulate Greenweb/Teletalk SMS Gateway API response
    const response = {
      messageId: `sms_${Date.now()}`,
      mobile: destination,
      status: 'SUBMITTED',
      operator: this.getOperatorFromNumber(destination),
      cost: 0.50, // BDT
      balance: Math.floor(Math.random() * 1000) + 500,
      timestamp: new Date().toISOString(),
    };

    // Simulate occasional failures (8% chance for SMS)
    const failureChance = Math.random();
    if (failureChance < 0.08) {
      const errorTypes = [
        'Insufficient balance',
        'Invalid mobile number',
        'Operator network error',
        'Gateway timeout',
      ];
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];

      return {
        success: false,
        message: 'SMS delivery failed',
        response: response,
        error: `SMS Gateway Error: ${randomError}`,
      };
    }

    // Log the SMS content (simulating actual sending)
    console.log(`[SMS SENT] To: ${destination}`);
    console.log(`Message: ${body}`);
    console.log(`Operator: ${response.operator} | Cost: ${response.cost} BDT | Balance: ${response.balance} BDT`);
    console.log(`--- SMS sent via Greenweb Gateway ---`);

    return {
      success: true,
      message: 'SMS sent successfully',
      response: { ...response, status: 'DELIVERED' },
    };
  }

  private getOperatorFromNumber(phone: string): string {
    // Simple Bangladesh operator detection from phone prefix
    const cleaned = phone.replace(/^\+880/, '0');
    if (cleaned.startsWith('017') || cleaned.startsWith('013')) return 'Grameenphone';
    if (cleaned.startsWith('018') || cleaned.startsWith('019')) return 'Robi';
    if (cleaned.startsWith('015') || cleaned.startsWith('016')) return 'Banglalink';
    if (cleaned.startsWith('014')) return 'Airtel';
    if (cleaned.startsWith('011')) return 'Teletalk';
    return 'Unknown';
  }
}
