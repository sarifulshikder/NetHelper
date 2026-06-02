import { Injectable } from '@nestjs/common';
import { NotificationDriver } from './notification-driver.interface';
import { NotificationChannel } from '../entities/notification-template.entity';

@Injectable()
export class WhatsAppDriver implements NotificationDriver {
  getChannel(): NotificationChannel {
    return NotificationChannel.WHATSAPP;
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
    // Simulate network latency (200-1000ms for WhatsApp Cloud API)
    const latency = Math.floor(Math.random() * 800) + 200;
    await new Promise((resolve) => setTimeout(resolve, latency));

    // Simulate Meta Cloud API / Twilio WhatsApp response
    const response = {
      messaging_product: 'whatsapp',
      contacts: [
        {
          input: destination,
          wa_id: `91${destination.replace(/^\+880/, '')}`, // Convert to international format
        },
      ],
      messages: [
        {
          id: `wamid.${Math.random().toString(36).substring(2, 15)}`,
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
      pricing: {
        billable: true,
        pricing_model: 'CBP',
        category: 'business_initiated',
      },
    };

    // Simulate occasional failures (3% chance for WhatsApp)
    const failureChance = Math.random();
    if (failureChance < 0.03) {
      const errorTypes = [
        'Message failed to send',
        'Recipient not on WhatsApp',
        'Business account restricted',
        'Rate limit exceeded',
      ];
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];

      return {
        success: false,
        message: 'WhatsApp message delivery failed',
        response: {
          ...response,
          errors: [
            {
              code: Math.floor(Math.random() * 1000) + 1000,
              title: randomError,
              details: 'Check recipient number and business account status',
            },
          ],
        },
        error: `WhatsApp API Error: ${randomError}`,
      };
    }

    // Log the WhatsApp message (simulating actual sending)
    console.log(`[WHATSAPP SENT] To: ${destination}`);
    console.log(`Message: ${body}`);
    console.log(`Message ID: ${response.messages[0].id}`);
    console.log(`Pricing: ${response.pricing.billable ? 'Billable' : 'Free'} (${response.pricing.category})`);
    console.log(`--- WhatsApp message sent via Meta Cloud API ---`);

    return {
      success: true,
      message: 'WhatsApp message sent successfully',
      response: { ...response, status: 'delivered' },
    };
  }
}
