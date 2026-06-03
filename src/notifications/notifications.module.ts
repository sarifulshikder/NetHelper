// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailDriver } from './drivers/email.driver';
import { SmsDriver } from './drivers/sms.driver';
import { WhatsAppDriver } from './drivers/whatsapp.driver';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplate, NotificationLog]),
  ],
  providers: [
    NotificationsService,
    EmailDriver,
    SmsDriver,
    WhatsAppDriver,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
