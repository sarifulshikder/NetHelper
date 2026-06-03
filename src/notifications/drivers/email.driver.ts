// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { NotificationDriver } from './notification-driver.interface';
import { NotificationChannel } from '../entities/notification-template.entity';

@Injectable()
export class EmailDriver implements NotificationDriver {
  getChannel(): NotificationChannel {
    return NotificationChannel.EMAIL;
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
    // Simulate network latency (50-500ms)
    const latency = Math.floor(Math.random() * 450) + 50;
    await new Promise((resolve) => setTimeout(resolve, latency));

    // Simulate SMTP/SendGrid API response
    const response = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      to: destination,
      subject: subject,
      status: 'queued',
      provider: 'SendGrid',
      ip_address: '192.168.1.100',
      timestamp: new Date().toISOString(),
    };

    // Simulate occasional failures (5% chance)
    const failureChance = Math.random();
    if (failureChance < 0.05) {
      return {
        success: false,
        message: 'Email delivery failed',
        response: response,
        error: 'SMTP server error: Connection timed out',
      };
    }

    // Log the email content (simulating actual sending)
    console.log(`[EMAIL SENT] To: ${destination}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}\n`);
    console.log(`--- Email sent via ${response.provider} ---`);

    return {
      success: true,
      message: 'Email sent successfully',
      response: { ...response, status: 'delivered' },
    };
  }
}
