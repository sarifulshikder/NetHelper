import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerChurnPrediction, ChurnRiskLevel } from './entities/customer-churn-prediction.entity';
import { Customer } from '../crm/customer.entity';
import { Invoice, InvoiceStatus } from '../billing/invoice.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { OnuDevice, OnuStatus } from '../hardware/onu-device.entity';

@Injectable()
export class CustomerAiAnalyticsService {
  constructor(
    @InjectRepository(CustomerChurnPrediction)
    private churnPredictionRepository: Repository<CustomerChurnPrediction>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(OnuDevice)
    private onuDeviceRepository: Repository<OnuDevice>,
  ) {}

  // Calculate churn prediction for a customer
  async calculateChurnPrediction(customerId: string): Promise<CustomerChurnPrediction> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get overdue payments
    const overduePayments = await this.invoiceRepository.count({
      where: {
        customer_id: customerId,
        status: In([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]),
        due_date: LessThan(new Date()),
      },
    });

    // Get recent tickets (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTickets = await this.ticketRepository.count({
      where: {
        customer_id: customerId,
        created_at: MoreThan(thirtyDaysAgo),
      },
    });

    // Get ONU signal drops (LOS events)
    const onuDevices = await this.onuDeviceRepository.find({
      where: { customer_id: customerId },
    });

    let signalDropCount = 0;
    for (const onu of onuDevices) {
      // Count LOS events in the last 30 days
      // In a real system, this would come from a signal log table
      if (onu.status_history) {
        const losEvents = onu.status_history.filter((event) => {
          const eventDate = new Date(event.timestamp);
          return (
            event.status === OnuStatus.LOS &&
            eventDate > thirtyDaysAgo
          );
        });
        signalDropCount += losEvents.length;
      }
    }

    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore(
      overduePayments,
      recentTickets,
      signalDropCount,
      customer.is_active,
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(healthScore);

    // Generate risk factors
    const riskFactors = [];
    if (overduePayments > 0) {
      riskFactors.push(`Overdue payments: ${overduePayments}`);
    }
    if (recentTickets > 2) {
      riskFactors.push(`Frequent support tickets: ${recentTickets} in last 30 days`);
    }
    if (signalDropCount > 3) {
      riskFactors.push(`Frequent signal drops: ${signalDropCount} LOS events`);
    }
    if (!customer.is_active) {
      riskFactors.push('Account is currently suspended');
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskLevel,
      overduePayments,
      recentTickets,
      signalDropCount,
    );

    // Create or update prediction
    let prediction = await this.churnPredictionRepository.findOne({
      where: { customer_id: customerId },
    });

    if (prediction) {
      prediction.health_score = healthScore;
      prediction.risk_level = riskLevel;
      prediction.overdue_payment_count = overduePayments;
      prediction.recent_ticket_count = recentTickets;
      prediction.signal_drop_count = signalDropCount;
      prediction.risk_factors = riskFactors.join('; ');
      prediction.recommendations = recommendations.join('; ');
    } else {
      prediction = this.churnPredictionRepository.create({
        customer_id: customerId,
        health_score: healthScore,
        risk_level: riskLevel,
        overdue_payment_count: overduePayments,
        recent_ticket_count: recentTickets,
        signal_drop_count: signalDropCount,
        risk_factors: riskFactors.join('; '),
        recommendations: recommendations.join('; '),
      });
    }

    return await this.churnPredictionRepository.save(prediction);
  }

  // Calculate health score
  private calculateHealthScore(
    overduePayments: number,
    recentTickets: number,
    signalDrops: number,
    isActive: boolean,
  ): number {
    // Base score for active customers
    let score = isActive ? 80 : 50;

    // Deduct for overdue payments (max 30 points deduction)
    score -= Math.min(overduePayments * 10, 30);

    // Deduct for recent tickets (max 20 points deduction)
    score -= Math.min(recentTickets * 2, 20);

    // Deduct for signal drops (max 15 points deduction)
    score -= Math.min(signalDrops * 1.5, 15);

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Determine risk level
  private determineRiskLevel(healthScore: number): ChurnRiskLevel {
    if (healthScore >= 70) {
      return ChurnRiskLevel.LOW;
    } else if (healthScore >= 40) {
      return ChurnRiskLevel.MEDIUM;
    } else {
      return ChurnRiskLevel.HIGH;
    }
  }

  // Generate recommendations
  private generateRecommendations(
    riskLevel: ChurnRiskLevel,
    overduePayments: number,
    recentTickets: number,
    signalDrops: number,
  ): string[] {
    const recommendations = [];

    if (riskLevel === ChurnRiskLevel.HIGH) {
      recommendations.push('Immediate retention call required');
      recommendations.push('Offer service discount or bonus data');
    } else if (riskLevel === ChurnRiskLevel.MEDIUM) {
      recommendations.push('Proactive customer check-in recommended');
      recommendations.push('Review service quality and usage patterns');
    }

    if (overduePayments > 0) {
      recommendations.push('Contact customer about overdue payments');
      recommendations.push('Offer flexible payment plan if needed');
    }

    if (recentTickets > 2) {
      recommendations.push('Investigate root cause of frequent issues');
      recommendations.push('Schedule technician visit for comprehensive check');
    }

    if (signalDrops > 3) {
      recommendations.push('Inspect fiber connections and ONU installation');
      recommendations.push('Check for environmental factors affecting signal');
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor customer status regularly');
    }

    return recommendations;
  }

  // Get churn predictions for all customers
  async getAllChurnPredictions(): Promise<CustomerChurnPrediction[]> {
    return await this.churnPredictionRepository.find({
      relations: ['customer'],
      order: { health_score: 'ASC' },
    });
  }

  // Get high-risk churn predictions
  async getHighRiskChurnPredictions(): Promise<CustomerChurnPrediction[]> {
    return await this.churnPredictionRepository.find({
      where: { risk_level: ChurnRiskLevel.HIGH },
      relations: ['customer'],
      order: { health_score: 'ASC' },
    });
  }

  // Get churn prediction by customer ID
  async getChurnPredictionByCustomerId(
    customerId: string,
  ): Promise<CustomerChurnPrediction | null> {
    return await this.churnPredictionRepository.findOne({
      where: { customer_id: customerId },
      relations: ['customer'],
    });
  }

  // Calculate churn predictions for all customers
  async calculateAllChurnPredictions(): Promise<CustomerChurnPrediction[]> {
    const customers = await this.customerRepository.find({
      where: { is_active: true },
    });

    const predictions = [];
    for (const customer of customers) {
      try {
        const prediction = await this.calculateChurnPrediction(customer.id);
        predictions.push(prediction);
      } catch (error) {
        console.error(
          `Error calculating churn prediction for customer ${customer.id}:`,
          error.message,
        );
      }
    }

    return predictions;
  }

  // Get churn risk distribution
  async getChurnRiskDistribution(): Promise<any> {
    const [low, medium, high] = await Promise.all([
      this.churnPredictionRepository.count({
        where: { risk_level: ChurnRiskLevel.LOW },
      }),
      this.churnPredictionRepository.count({
        where: { risk_level: ChurnRiskLevel.MEDIUM },
      }),
      this.churnPredictionRepository.count({
        where: { risk_level: ChurnRiskLevel.HIGH },
      }),
    ]);

    const total = low + medium + high;

    return {
      low: {
        count: low,
        percentage: total > 0 ? (low / total) * 100 : 0,
      },
      medium: {
        count: medium,
        percentage: total > 0 ? (medium / total) * 100 : 0,
      },
      high: {
        count: high,
        percentage: total > 0 ? (high / total) * 100 : 0,
      },
      total,
    };
  }
}
