import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationTriggerEvent, NotificationChannel } from './entities/notification-template.entity';
import { NotificationStatus } from './entities/notification-log.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('templates')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getAllTemplates() {
    return this.notificationsService.getAllTemplates();
  }

  @Put('templates/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: {
      channel: NotificationChannel;
      subject: string;
      template_body: string;
      is_active: boolean;
    },
  ) {
    const template = await this.notificationsService.getTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    return this.notificationsService.createOrUpdateTemplate(
      template.trigger_event,
      body.channel,
      body.subject,
      body.template_body,
      body.is_active,
    );
  }

  @Get('logs')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllNotificationLogs(
    @Query('customerId') customerId?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getAllNotificationLogs(
      customerId,
      channel,
      status,
      limit || 100,
    );
  }

  @Post('test-send')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async testSendNotification(
    @Body() body: {
      channel: NotificationChannel;
      destination: string;
      subject: string;
      body: string;
    },
  ) {
    return this.notificationsService.testSendNotification(
      body.channel,
      body.destination,
      body.subject,
      body.body,
    );
  }

  // Hook endpoints for internal system use
  @Post('hook/welcome')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendWelcomeNotification(@Body() body: { customerId: string }) {
    return this.notificationsService.sendWelcomeNotification(body.customerId);
  }

  @Post('hook/invoice-generated')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendInvoiceGeneratedNotification(
    @Body() body: {
      customerId: string;
      invoiceNumber: string;
      amount: number;
      dueDate: string;
    },
  ) {
    return this.notificationsService.sendInvoiceGeneratedNotification(
      body.customerId,
      body.invoiceNumber,
      body.amount,
      body.dueDate,
    );
  }

  @Post('hook/invoice-overdue')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendInvoiceOverdueNotification(
    @Body() body: {
      customerId: string;
      invoiceNumber: string;
      amount: number;
      daysOverdue: number;
    },
  ) {
    return this.notificationsService.sendInvoiceOverdueNotification(
      body.customerId,
      body.invoiceNumber,
      body.amount,
      body.daysOverdue,
    );
  }

  @Post('hook/account-suspended')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendAccountSuspendedNotification(
    @Body() body: {
      customerId: string;
      reason: string;
    },
  ) {
    return this.notificationsService.sendAccountSuspendedNotification(
      body.customerId,
      body.reason,
    );
  }

  @Post('hook/ticket-updated')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendTicketUpdatedNotification(
    @Body() body: {
      customerId: string;
      ticketId: string;
      status: string;
      technicianName: string;
    },
  ) {
    return this.notificationsService.sendTicketUpdatedNotification(
      body.customerId,
      body.ticketId,
      body.status,
      body.technicianName,
    );
  }

  @Post('hook/payment-received')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendPaymentReceivedNotification(
    @Body() body: {
      customerId: string;
      amount: number;
      invoiceNumber: string;
    },
  ) {
    return this.notificationsService.sendPaymentReceivedNotification(
      body.customerId,
      body.amount,
      body.invoiceNumber,
    );
  }

  @Post('hook/maintenance-scheduled')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async sendMaintenanceScheduledNotification(
    @Body() body: {
      customerId: string;
      maintenanceDate: string;
      duration: string;
      affectedServices: string;
    },
  ) {
    return this.notificationsService.sendMaintenanceScheduledNotification(
      body.customerId,
      body.maintenanceDate,
      body.duration,
      body.affectedServices,
    );
  }

  @Post('initialize-defaults')
  @Roles('Super Admin', 'ISP Admin')
  async initializeDefaultTemplates() {
    return this.notificationsService.initializeDefaultTemplates();
  }
}
