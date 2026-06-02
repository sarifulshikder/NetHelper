import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getExecutiveOverviewMetrics() {
    return this.analyticsService.getExecutiveOverviewMetrics();
  }

  @Get('trends/revenue')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getRevenueTrends(@Query('months') months?: number) {
    return this.analyticsService.getRevenueTrends(months || 6);
  }

  @Get('performance/tickets')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getTicketPerformanceMetrics() {
    return this.analyticsService.getTicketPerformanceMetrics();
  }

  @Get('export/financials')
  @Roles('Super Admin', 'ISP Admin')
  async exportFinancialData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.exportFinancialData(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('acquisition')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getCustomerAcquisitionMetrics() {
    return this.analyticsService.getCustomerAcquisitionMetrics();
  }

  @Get('efficiency')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getOperationalEfficiencyMetrics() {
    return this.analyticsService.getOperationalEfficiencyMetrics();
  }
}
