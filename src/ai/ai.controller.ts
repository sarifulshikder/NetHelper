import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { CustomerAiAnalyticsService } from './customer-ai-analytics.service';
import { SmartCopilotService } from './smart-copilot.service';
import { TelemetryAnomalyDetectorService } from './telemetry-anomaly-detector.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ChurnRiskLevel } from './entities/customer-churn-prediction.entity';
import { AnomalyStatus } from './entities/telemetry-anomaly.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly customerAiAnalyticsService: CustomerAiAnalyticsService,
    private readonly smartCopilotService: SmartCopilotService,
    private readonly telemetryAnomalyDetectorService: TelemetryAnomalyDetectorService,
  ) {}

  @Get('churn-predictions')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getChurnPredictions(@Query('risk') risk?: ChurnRiskLevel) {
    if (risk) {
      if (risk === ChurnRiskLevel.HIGH) {
        return this.customerAiAnalyticsService.getHighRiskChurnPredictions();
      }
      // For other risk levels, we'd filter accordingly
    }
    return this.customerAiAnalyticsService.getAllChurnPredictions();
  }

  @Post('churn-predictions/calculate')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async calculateAllChurnPredictions() {
    return this.customerAiAnalyticsService.calculateAllChurnPredictions();
  }

  @Get('churn-predictions/:customerId')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getChurnPrediction(@Param('customerId') customerId: string) {
    return this.customerAiAnalyticsService.getChurnPredictionByCustomerId(
      customerId,
    );
  }

  @Get('churn-stats')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getChurnRiskDistribution() {
    return this.customerAiAnalyticsService.getChurnRiskDistribution();
  }

  @Post('tickets/:id/analyze')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async analyzeTicket(@Param('id') ticketId: string) {
    return this.smartCopilotService.analyzeTicket(ticketId);
  }

  @Post('tickets/:id/categorize')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async categorizeTicket(@Param('id') ticketId: string) {
    return this.smartCopilotService.autoCategorizeTicket(ticketId);
  }

  @Get('tickets/:id/insights')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getTicketInsights(@Param('id') ticketId: string) {
    return this.smartCopilotService.getTicketInsights(ticketId);
  }

  @Get('network/anomalies')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getTelemetryAnomalies(@Query('status') status?: AnomalyStatus) {
    return this.telemetryAnomalyDetectorService.getAllTelemetryAnomalies(status);
  }

  @Post('network/anomalies/detect')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async detectAnomalies() {
    return this.telemetryAnomalyDetectorService.detectAnomaliesForAllCustomers();
  }

  @Get('network/anomalies/recent')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getRecentAnomalies() {
    return this.telemetryAnomalyDetectorService.getRecentAnomalies();
  }

  @Post('network/anomalies/:id/status')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async updateAnomalyStatus(
    @Param('id') anomalyId: string,
    @Query('status') status: AnomalyStatus,
  ) {
    return this.telemetryAnomalyDetectorService.updateAnomalyStatus(
      anomalyId,
      status,
    );
  }

  @Get('network/anomalies/stats')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getAnomalyStatistics() {
    return this.telemetryAnomalyDetectorService.getAnomalyStatistics();
  }

  @Get('network/anomalies/customer/:customerId')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getAnomaliesByCustomer(@Param('customerId') customerId: string) {
    return this.telemetryAnomalyDetectorService.getAnomaliesByCustomer(
      customerId,
    );
  }

  @Get('ai-driver-info')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getAiDriverInfo() {
    return this.smartCopilotService.getAiDriverInfo();
  }
}
