// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate, NotificationTriggerEvent, NotificationChannel } from './entities/notification-template.entity';
import { NotificationLog, NotificationStatus } from './entities/notification-log.entity';
import { Customer } from '../crm/customer.entity';
import { EmailDriver } from './drivers/email.driver';
import { SmsDriver } from './drivers/sms.driver';
import { WhatsAppDriver } from './drivers/whatsapp.driver';
import { NotificationDriver } from './drivers/notification-driver.interface';

@Injectable()
export class NotificationsService {
  private drivers: Map<NotificationChannel, NotificationDriver>;

  constructor(
    @InjectRepository(NotificationTemplate)
    private notificationTemplateRepository: Repository<NotificationTemplate>,
    @InjectRepository(NotificationLog)
    private notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private emailDriver: EmailDriver,
    private smsDriver: SmsDriver,
    private whatsappDriver: WhatsAppDriver,
  ) {
    this.drivers = new Map();
    this.drivers.set(NotificationChannel.EMAIL, this.emailDriver);
    this.drivers.set(NotificationChannel.SMS, this.smsDriver);
    this.drivers.set(NotificationChannel.WHATSAPP, this.whatsappDriver);
  }

  // Compile template with context data
  private compileTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? context[key] : match;
    });
  }

  // Get destination based on channel
  private getDestination(customer: Customer, channel: NotificationChannel): string {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return customer.email;
      case NotificationChannel.SMS:
      case NotificationChannel.WHATSAPP:
        return customer.phone.startsWith('+') ? customer.phone : `+880${customer.phone.substring(1)}`;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  // Main notification trigger method
  async triggerNotification(
    customerId: string,
    eventType: NotificationTriggerEvent,
    contextData: Record<string, any> = {},
  ): Promise<NotificationLog> {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Get template for this event
    const template = await this.notificationTemplateRepository.findOne({
      where: {
        trigger_event: eventType,
        is_active: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`No active template found for event: ${eventType}`);
    }

    // Compile template with context data
    const compiledSubject = this.compileTemplate(template.subject, contextData);
    const compiledBody = this.compileTemplate(template.template_body, contextData);

    // Get destination
    const destination = this.getDestination(customer, template.channel);

    // Create pending log
    const log = this.notificationLogRepository.create({
      customer_id: customerId,
      channel: template.channel,
      destination: destination,
      sent_body: compiledBody,
      trigger_event: eventType,
      status: NotificationStatus.PENDING,
    });

    const savedLog = await this.notificationLogRepository.save(log);

    try {
      // Get driver for this channel
      const driver = this.drivers.get(template.channel);
      if (!driver) {
        throw new Error(`No driver found for channel: ${template.channel}`);
      }

      // Send notification
      const result = await driver.send(destination, compiledSubject, compiledBody);

      // Update log status
      savedLog.status = result.success ? NotificationStatus.SENT : NotificationStatus.FAILED;
      savedLog.error_message = result.success ? null : result.error;
      savedLog.sent_at = new Date();

      if (!result.success) {
        savedLog.retry_count = 1;
      }

      await this.notificationLogRepository.save(savedLog);

      return savedLog;
    } catch (error) {
      // Update log with error
      savedLog.status = NotificationStatus.FAILED;
      savedLog.error_message = error.message;
      savedLog.retry_count = 1;
      savedLog.sent_at = new Date();

      await this.notificationLogRepository.save(savedLog);
      throw error;
    }
  }

  // Convenience hook methods
  async sendWelcomeNotification(customerId: string): Promise<NotificationLog> {
    return this.triggerNotification(customerId, NotificationTriggerEvent.WELCOME_USER, {
      customer_name: '', // Will be filled by template compilation
      company_name: 'NetHelper ISP',
      support_email: 'support@nethisp.com',
    });
  }

  async sendInvoiceGeneratedNotification(
    customerId: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
  ): Promise<NotificationLog> {
    return this.triggerNotification(
      customerId,
      NotificationTriggerEvent.INVOICE_GENERATED,
      {
        invoice_number: invoiceNumber,
        amount: amount.toFixed(2),
        due_date: dueDate,
        currency: 'BDT',
      },
    );
  }

  async sendInvoiceOverdueNotification(
    customerId: string,
    invoiceNumber: string,
    amount: number,
    daysOverdue: number,
  ): Promise<NotificationLog> {
    return this.triggerNotification(
      customerId,
      NotificationTriggerEvent.INVOICE_OVERDUE,
      {
        invoice_number: invoiceNumber,
        amount: amount.toFixed(2),
        days_overdue: daysOverdue,
        currency: 'BDT',
        suspension_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    );
  }

  async sendAccountSuspendedNotification(
    customerId: string,
    reason: string,
  ): Promise<NotificationLog> {
    return this.triggerNotification(
      customerId,
      NotificationTriggerEvent.ACCOUNT_SUSPENDED,
      {
        reason: reason,
        reactivation_instructions: 'Please pay your overdue invoices to restore service.',
      },
    );
  }

  async sendTicketUpdatedNotification(
    customerId: string,
    ticketId: string,
    status: string,
    technicianName: string,
  ): Promise<NotificationLog> {
    return this.triggerNotification(
      customerId,
      NotificationTriggerEvent.TICKET_UPDATED,
      {
        ticket_id: ticketId,
        status: status,
        technician_name: technicianName,
      },
    );
  }

  async sendPaymentReceivedNotification(
    customerId: string,
    amount: number,
    invoiceNumber: string,
  ): Promise<NotificationLog> {
    return this.triggerNotification(
      customerId,
      NotificationTriggerEvent.PAYMENT_RECEIVED,
      {
        amount: amount.toFixed(2),
        invoice_number: invoiceNumber,
        currency: 'BDT',
        reactivation_status: 'Your service has been reactivated.',
      },
    );
  }

  async sendMaintenanceScheduledNotification(
    customerId: string,
    maintenanceDate: string,
    duration: string,
    affectedServices: string,
  ): Promise<NotificationLog> {
    return this.triggerNotification(
      customerId,
      NotificationTriggerEvent.MAINTENANCE_SCHEDULED,
      {
        maintenance_date: maintenanceDate,
        duration: duration,
        affected_services: affectedServices,
      },
    );
  }

  // Create or update notification template
  async createOrUpdateTemplate(
    triggerEvent: NotificationTriggerEvent,
    channel: NotificationChannel,
    subject: string,
    templateBody: string,
    isActive: boolean = true,
  ): Promise<NotificationTemplate> {
    let template = await this.notificationTemplateRepository.findOne({
      where: { trigger_event: triggerEvent },
    });

    if (template) {
      template.channel = channel;
      template.subject = subject;
      template.template_body = templateBody;
      template.is_active = isActive;
    } else {
      template = this.notificationTemplateRepository.create({
        trigger_event: triggerEvent,
        channel: channel,
        subject: subject,
        template_body: templateBody,
        is_active: isActive,
      });
    }

    return await this.notificationTemplateRepository.save(template);
  }

  // Get all templates
  async getAllTemplates(): Promise<NotificationTemplate[]> {
    return await this.notificationTemplateRepository.find({
      order: { trigger_event: 'ASC' },
    });
  }

  // Get template by ID
  async getTemplateById(id: string): Promise<NotificationTemplate | null> {
    return await this.notificationTemplateRepository.findOne({ where: { id } });
  }

  // Get all notification logs
  async getAllNotificationLogs(
    customerId?: string,
    channel?: NotificationChannel,
    status?: NotificationStatus,
    limit?: number,
  ): Promise<NotificationLog[]> {
    const query = this.notificationLogRepository
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC');

    if (customerId) {
      query.andWhere('log.customer_id = :customerId', { customerId });
    }

    if (channel) {
      query.andWhere('log.channel = :channel', { channel });
    }

    if (status) {
      query.andWhere('log.status = :status', { status });
    }

    if (limit) {
      query.limit(limit);
    }

    return await query.getMany();
  }

  // Test send notification
  async testSendNotification(
    channel: NotificationChannel,
    destination: string,
    subject: string,
    body: string,
  ): Promise<NotificationLog> {
    // Create test log
    const log = this.notificationLogRepository.create({
      customer_id: 'test_customer', // Special ID for test notifications
      channel: channel,
      destination: destination,
      sent_body: body,
      trigger_event: 'TEST_NOTIFICATION',
      status: NotificationStatus.PENDING,
    });

    const savedLog = await this.notificationLogRepository.save(log);

    try {
      // Get driver
      const driver = this.drivers.get(channel);
      if (!driver) {
        throw new Error(`No driver found for channel: ${channel}`);
      }

      // Send test notification
      const result = await driver.send(destination, subject, body);

      // Update log
      savedLog.status = result.success ? NotificationStatus.SENT : NotificationStatus.FAILED;
      savedLog.error_message = result.success ? null : result.error;
      savedLog.sent_at = new Date();

      await this.notificationLogRepository.save(savedLog);

      return savedLog;
    } catch (error) {
      savedLog.status = NotificationStatus.FAILED;
      savedLog.error_message = error.message;
      savedLog.sent_at = new Date();
      await this.notificationLogRepository.save(savedLog);
      throw error;
    }
  }

  // Initialize default templates for a new tenant
  async initializeDefaultTemplates(): Promise<NotificationTemplate[]> {
    const defaultTemplates = [
      {
        trigger_event: NotificationTriggerEvent.WELCOME_USER,
        channel: NotificationChannel.EMAIL,
        subject: 'Welcome to {{company_name}}!',
        template_body: `
          <h1>Welcome, {{customer_name}}!</h1>
          <p>Thank you for choosing {{company_name}} as your internet service provider.</p>
          <p>Your account has been successfully created.</p>
          <p>If you have any questions, please contact us at {{support_email}}.</p>
        `,
      },
      {
        trigger_event: NotificationTriggerEvent.INVOICE_GENERATED,
        channel: NotificationChannel.EMAIL,
        subject: 'Your Invoice #{{invoice_number}} is Ready',
        template_body: `
          <h1>Invoice Generated</h1>
          <p>Dear {{customer_name}},</p>
          <p>Your invoice #{{invoice_number}} for {{amount}} {{currency}} has been generated.</p>
          <p>Due Date: {{due_date}}</p>
          <p>Please pay by the due date to avoid service interruption.</p>
        `,
      },
      {
        trigger_event: NotificationTriggerEvent.INVOICE_OVERDUE,
        channel: NotificationChannel.SMS,
        subject: 'Overdue Invoice',
        template_body: `
          Dear {{customer_name}},
          Your invoice #{{invoice_number}} for {{amount}} {{currency}} is {{days_overdue}} days overdue.
          Please pay immediately to avoid suspension by {{suspension_date}}.
          Thank you.
        `,
      },
      {
        trigger_event: NotificationTriggerEvent.ACCOUNT_SUSPENDED,
        channel: NotificationChannel.WHATSAPP,
        subject: 'Account Suspended',
        template_body: `
          Dear {{customer_name}},
          Your account has been suspended due to: {{reason}}.
          {{reactivation_instructions}}
          Contact support immediately.
        `,
      },
      {
        trigger_event: NotificationTriggerEvent.TICKET_UPDATED,
        channel: NotificationChannel.EMAIL,
        subject: 'Ticket #{{ticket_id}} Updated',
        template_body: `
          <h1>Ticket Update</h1>
          <p>Dear {{customer_name}},</p>
          <p>Your ticket #{{ticket_id}} has been updated.</p>
          <p>New Status: {{status}}</p>
          <p>Technician: {{technician_name}}</p>
          <p>We will keep you updated on the progress.</p>
        `,
      },
      {
        trigger_event: NotificationTriggerEvent.PAYMENT_RECEIVED,
        channel: NotificationChannel.SMS,
        subject: 'Payment Received',
        template_body: `
          Dear {{customer_name}},
          Thank you! We have received your payment of {{amount}} {{currency}} for invoice #{{invoice_number}}.
          {{reactivation_status}}
          Enjoy uninterrupted service!
        `,
      },
      {
        trigger_event: NotificationTriggerEvent.MAINTENANCE_SCHEDULED,
        channel: NotificationChannel.WHATSAPP,
        subject: 'Scheduled Maintenance',
        template_body: `
          Dear {{customer_name}},
          Scheduled maintenance on {{maintenance_date}} for {{duration}}.
          Affected services: {{affected_services}}.
          We apologize for any inconvenience.
        `,
      },
    ];

    const templates = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createOrUpdateTemplate(
        templateData.trigger_event,
        templateData.channel,
        templateData.subject,
        templateData.template_body,
        true,
      );
      templates.push(template);
    }

    return templates;
  }
}
