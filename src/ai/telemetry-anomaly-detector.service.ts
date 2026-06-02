import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryAnomaly, AnomalyType, AnomalyStatus } from './entities/telemetry-anomaly.entity';
import { Customer } from '../crm/customer.entity';
import { OnuDevice, OnuStatus } from '../hardware/onu-device.entity';
import { PortalService } from '../portal/portal.service';

@Injectable()
export class TelemetryAnomalyDetectorService {
  constructor(
    @InjectRepository(TelemetryAnomaly)
    private telemetryAnomalyRepository: Repository<TelemetryAnomaly>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(OnuDevice)
    private onuDeviceRepository: Repository<OnuDevice>,
    private portalService: PortalService,
  ) {}

  // Detect anomalies for all customers
  async detectAnomaliesForAllCustomers(): Promise<TelemetryAnomaly[]> {
    const customers = await this.customerRepository.find({
      where: { is_active: true },
      relations: ['onuDevices'],
    });

    const anomalies = [];
    for (const customer of customers) {
      try {
        const customerAnomalies = await this.detectCustomerAnomalies(customer.id);
        anomalies.push(...customerAnomalies);
      } catch (error) {
        console.error(
          `Error detecting anomalies for customer ${customer.id}:`,
          error.message,
        );
      }
    }

    return anomalies;
  }

  // Detect anomalies for a specific customer
  async detectCustomerAnomalies(customerId: string): Promise<TelemetryAnomaly[]> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      relations: ['onuDevices'],
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get usage statistics
    const usageStats = await this.portalService.getUsageStatistics(customerId);

    // Get ONU devices
    const onuDevices = customer.onuDevices || [];

    const anomalies = [];

    // Check for sudden drop in usage
    if (usageStats.daily && usageStats.daily.length >= 3) {
      const recentDays = usageStats.daily.slice(0, 3);
      const avgUsage = 
        recentDays.reduce((sum, day) => sum + day.total_gb, 0) / recentDays.length;

      // If all recent days are significantly below average
      const allLowUsage = recentDays.every((day) => day.total_gb < avgUsage * 0.3);

      if (allLowUsage && avgUsage > 5) {
        // Significant drop for a customer who normally uses >5GB/day
        const anomaly = this.telemetryAnomalyRepository.create({
          customer_id: customerId,
          anomaly_type: AnomalyType.SUDDEN_DROP,
          description: `Sudden drop in usage: ${avgUsage.toFixed(2)}GB avg → ${recentDays[0].total_gb.toFixed(2)}GB`,
          baseline_data: { avg_usage_gb: avgUsage },
          observed_data: { current_usage_gb: recentDays[0].total_gb },
          deviation_percentage: 
            ((avgUsage - recentDays[0].total_gb) / avgUsage) * 100,
        });
        anomalies.push(anomaly);
      }
    }

    // Check for uncharacteristic spikes
    if (usageStats.daily && usageStats.daily.length >= 7) {
      const weeklyUsage = usageStats.daily.map((day) => day.total_gb);
      const avgUsage = 
        weeklyUsage.reduce((sum, usage) => sum + usage, 0) / weeklyUsage.length;
      const stdDev = Math.sqrt(
        weeklyUsage
          .map((usage) => Math.pow(usage - avgUsage, 2))
          .reduce((sum, val) => sum + val, 0) / weeklyUsage.length,
      );

      const latestUsage = usageStats.daily[0].total_gb;

      // If latest usage is more than 3 standard deviations above average
      if (latestUsage > avgUsage + 3 * stdDev && stdDev > 0) {
        const anomaly = this.telemetryAnomalyRepository.create({
          customer_id: customerId,
          anomaly_type: AnomalyType.UNCHARACTERISTIC_SPIKE,
          description: `Uncharacteristic usage spike: ${avgUsage.toFixed(2)}GB avg → ${latestUsage.toFixed(2)}GB`,
          baseline_data: { avg_usage_gb: avgUsage, std_dev: stdDev },
          observed_data: { current_usage_gb: latestUsage },
          deviation_percentage: ((latestUsage - avgUsage) / avgUsage) * 100,
        });
        anomalies.push(anomaly);
      }
    }

    // Check for consistent low usage
    if (usageStats.monthly && usageStats.monthly.length >= 2) {
      const currentMonth = usageStats.monthly[0].total_gb;
      const previousMonth = usageStats.monthly[1].total_gb;

      // If current month usage is less than 30% of previous month
      if (currentMonth < previousMonth * 0.3 && previousMonth > 10) {
        const anomaly = this.telemetryAnomalyRepository.create({
          customer_id: customerId,
          anomaly_type: AnomalyType.CONSISTENT_LOW_USAGE,
          description: `Consistent low usage: ${previousMonth.toFixed(2)}GB → ${currentMonth.toFixed(2)}GB`,
          baseline_data: { previous_month_gb: previousMonth },
          observed_data: { current_month_gb: currentMonth },
          deviation_percentage: 
            ((previousMonth - currentMonth) / previousMonth) * 100,
        });
        anomalies.push(anomaly);
      }
    }

    // Check for signal quality degradation
    for (const onu of onuDevices) {
      if (onu.status_history && onu.status_history.length > 0) {
        const recentSignalDrops = onu.status_history.filter(
          (event) =>
            event.status === OnuStatus.LOS &&
            new Date(event.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        );

        if (recentSignalDrops.length >= 5) {
          // 5 or more LOS events in the last week
          const anomaly = this.telemetryAnomalyRepository.create({
            customer_id: customerId,
            onu_device_id: onu.id,
            anomaly_type: AnomalyType.SIGNAL_QUALITY_DEGRADATION,
            description: `Frequent signal drops: ${recentSignalDrops.length} LOS events in last 7 days`,
            baseline_data: { expected_los_events: '0-2 per week' },
            observed_data: { actual_los_events: recentSignalDrops.length },
            deviation_percentage: 100,
          });
          anomalies.push(anomaly);
        }
      }
    }

    // Save all detected anomalies
    return await this.telemetryAnomalyRepository.save(anomalies);
  }

  // Get all telemetry anomalies
  async getAllTelemetryAnomalies(
    status?: AnomalyStatus,
    limit?: number,
  ): Promise<TelemetryAnomaly[]> {
    const query = this.telemetryAnomalyRepository
      .createQueryBuilder('anomaly')
      .leftJoinAndSelect('anomaly.customer', 'customer')
      .leftJoinAndSelect('anomaly.onuDevice', 'onuDevice')
      .orderBy('anomaly.detected_at', 'DESC');

    if (status) {
      query.andWhere('anomaly.status = :status', { status });
    }

    if (limit) {
      query.limit(limit);
    }

    return await query.getMany();
  }

  // Get anomalies by customer
  async getAnomaliesByCustomer(
    customerId: string,
    status?: AnomalyStatus,
  ): Promise<TelemetryAnomaly[]> {
    const query = this.telemetryAnomalyRepository
      .createQueryBuilder('anomaly')
      .where('anomaly.customer_id = :customerId', { customerId })
      .leftJoinAndSelect('anomaly.onuDevice', 'onuDevice')
      .orderBy('anomaly.detected_at', 'DESC');

    if (status) {
      query.andWhere('anomaly.status = :status', { status });
    }

    return await query.getMany();
  }

  // Update anomaly status
  async updateAnomalyStatus(
    anomalyId: string,
    status: AnomalyStatus,
    notes?: string,
  ): Promise<TelemetryAnomaly> {
    const anomaly = await this.telemetryAnomalyRepository.findOne({
      where: { id: anomalyId },
    });

    if (!anomaly) {
      throw new Error('Anomaly not found');
    }

    anomaly.status = status;
    if (notes) {
      anomaly.notes = notes;
    }

    if (status === AnomalyStatus.RESOLVED) {
      anomaly.resolved_at = new Date();
    }

    return await this.telemetryAnomalyRepository.save(anomaly);
  }

  // Get anomaly by ID
  async getAnomalyById(anomalyId: string): Promise<TelemetryAnomaly | null> {
    return await this.telemetryAnomalyRepository.findOne({
      where: { id: anomalyId },
      relations: ['customer', 'onuDevice'],
    });
  }

  // Get anomaly statistics
  async getAnomalyStatistics(): Promise<any> {
    const [total, detected, investigating, resolved, falsePositive] = 
      await Promise.all([
        this.telemetryAnomalyRepository.count(),
        this.telemetryAnomalyRepository.count({
          where: { status: AnomalyStatus.DETECTED },
        }),
        this.telemetryAnomalyRepository.count({
          where: { status: AnomalyStatus.INVESTIGATING },
        }),
        this.telemetryAnomalyRepository.count({
          where: { status: AnomalyStatus.RESOLVED },
        }),
        this.telemetryAnomalyRepository.count({
          where: { status: AnomalyStatus.FALSE_POSITIVE },
        }),
      ]);

    const byType = await this.telemetryAnomalyRepository
      .createQueryBuilder('anomaly')
      .select('anomaly.anomaly_type', 'type')
      .addSelect('COUNT(anomaly.id)', 'count')
      .groupBy('anomaly.anomaly_type')
      .getRawMany();

    return {
      total,
      status_distribution: {
        detected,
        investigating,
        resolved,
        false_positive: falsePositive,
      },
      type_distribution: byType,
    };
  }

  // Get recent anomalies (last 7 days)
  async getRecentAnomalies(): Promise<TelemetryAnomaly[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await this.telemetryAnomalyRepository.find({
      where: {
        detected_at: MoreThan(sevenDaysAgo),
      },
      relations: ['customer', 'onuDevice'],
      order: { detected_at: 'DESC' },
    });
  }
}
