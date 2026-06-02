import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { Customer } from '../crm/customer.entity';
import { OnuDevice } from '../hardware/onu-device.entity';
import { GisService } from '../gis/gis.service';
import { OpenAiDriver } from './drivers/openai.driver';
import { SandboxAiDriver } from './drivers/sandbox-ai.driver';
import { AiDriver } from './drivers/ai-driver.interface';

@Injectable()
export class SmartCopilotService {
  private aiDriver: AiDriver;

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(OnuDevice)
    private onuDeviceRepository: Repository<OnuDevice>,
    private gisService: GisService,
    private openAiDriver: OpenAiDriver,
    private sandboxAiDriver: SandboxAiDriver,
  ) {
    // Use OpenAI driver if available, otherwise fallback to sandbox
    this.aiDriver = process.env.OPENAI_API_KEY ? this.openAiDriver : this.sandboxAiDriver;
  }

  // Analyze ticket and generate AI insights
  async analyzeTicket(ticketId: string): Promise<any> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const customer = await this.customerRepository.findOne({
      where: { id: ticket.customer_id },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get ONU device for network context
    const onuDevice = await this.onuDeviceRepository.findOne({
      where: { customer_id: customer.id },
    });

    // Get GIS network context
    let networkContext = {};
    if (customer.location_lat && customer.location_long) {
      try {
        // In a real system, we would trace the fiber path
        // For now, we'll simulate some network data
        networkContext = {
          fiberDistance: Math.floor(Math.random() * 15000) + 500, // 500m to 15.5km
          signalStrength: -20 + Math.random() * 10, // -20 to -10 dBm (good range)
        };

        // Simulate some signal issues for certain customers
        if (Math.random() < 0.2) {
          networkContext.signalStrength = -30 + Math.random() * 5; // -30 to -25 dBm (poor range)
        }
      } catch (error) {
        console.error('Error getting GIS data:', error.message);
      }
    }

    // Prepare customer context
    const customerContext = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      service_plan: customer.service_plan,
      is_active: customer.is_active,
      activation_date: customer.activation_date,
    };

    // Analyze ticket text with AI
    const aiAnalysis = await this.aiDriver.analyzeText(ticket.description, {
      customer_name: customer.name,
      service_plan: customer.service_plan,
    });

    // Generate resolution script
    const resolutionScript = await this.aiDriver.generateResolutionScript(
      ticket.description,
      customerContext,
      networkContext,
    );

    return {
      ticket_id: ticket.id,
      customer_id: customer.id,
      customer_name: customer.name,
      ai_analysis: {
        categories: aiAnalysis.categories,
        sentiment: aiAnalysis.sentiment,
        summary: aiAnalysis.summary,
        suggestions: aiAnalysis.suggestions,
      },
      resolution_script: resolutionScript.script,
      script_confidence: resolutionScript.confidence,
      network_context: networkContext,
      customer_context: customerContext,
    };
  }

  // Auto-categorize ticket
  async autoCategorizeTicket(ticketId: string): Promise<{ categories: string[]; primary_category: string }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const analysis = await this.aiDriver.analyzeText(ticket.description);

    // Determine primary category
    const categoryPriority = [
      'SPEED_ISSUE',
      'CONNECTIVITY_ISSUE',
      'HARDWARE_ISSUE',
      'BILLING_INQUIRY',
      'INSTALLATION_REQUEST',
    ];

    let primaryCategory = 'GENERAL_INQUIRY';
    for (const category of categoryPriority) {
      if (analysis.categories.includes(category)) {
        primaryCategory = category;
        break;
      }
    }

    return {
      categories: analysis.categories,
      primary_category: primaryCategory,
    };
  }

  // Get ticket insights
  async getTicketInsights(ticketId: string): Promise<any> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['history'],
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const customer = await this.customerRepository.findOne({
      where: { id: ticket.customer_id },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate time to first response
    let timeToFirstResponse = null;
    const firstResponse = ticket.history
      .filter((h) => h.action === 'IN_PROGRESS')
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())[0];

    if (firstResponse) {
      const diffMs = firstResponse.created_at.getTime() - ticket.created_at.getTime();
      timeToFirstResponse = Math.round(diffMs / (1000 * 60)); // minutes
    }

    // Calculate total resolution time if resolved
    let resolutionTime = null;
    if (ticket.status === TicketStatus.RESOLVED) {
      const resolvedEvent = ticket.history
        .filter((h) => h.action === 'RESOLVED')
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

      if (resolvedEvent) {
        const diffMs = resolvedEvent.created_at.getTime() - ticket.created_at.getTime();
        resolutionTime = Math.round(diffMs / (1000 * 60 * 60)); // hours
      }
    }

    // Check if SLA was breached
    let slaBreached = false;
    if (ticket.sla_due_date && resolutionTime) {
      const resolvedAt = new Date(ticket.created_at.getTime() + resolutionTime * 60 * 60 * 1000);
      slaBreached = resolvedAt > ticket.sla_due_date;
    }

    return {
      ticket_id: ticket.id,
      customer_id: customer.id,
      customer_name: customer.name,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      created_at: ticket.created_at,
      time_to_first_response_minutes: timeToFirstResponse,
      resolution_time_hours: resolutionTime,
      sla_due_date: ticket.sla_due_date,
      sla_breached: slaBreached,
      history_count: ticket.history.length,
    };
  }

  // Set AI driver (for testing or configuration)
  setAiDriver(driver: AiDriver): void {
    this.aiDriver = driver;
  }

  // Get current AI driver info
  getAiDriverInfo(): { type: string; is_sandbox: boolean } {
    return {
      type: this.aiDriver.constructor.name,
      is_sandbox: this.aiDriver instanceof SandboxAiDriver,
    };
  }
}
