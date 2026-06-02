import { NotificationChannel } from '../entities/notification-template.entity';

export interface NotificationDriver {
  getChannel(): NotificationChannel;

  send(
    destination: string,
    subject: string,
    body: string,
  ): Promise<{
    success: boolean;
    message: string;
    response?: any;
    error?: string;
  }>;
}
