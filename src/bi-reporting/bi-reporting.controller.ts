import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BiReportingService } from './bi-reporting.service';
import { CustomReportTemplate, EntityType } from './custom-report-template.entity';
import { ReportJob } from './report-job.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('bi/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BiReportingController {
  constructor(private readonly biService: BiReportingService) {}

  @Post('templates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async createTemplate(
    @Body() body: {
      name: string;
      entity_type: EntityType;
      selected_fields: string[];
      filter_conditions?: any;
    },
    @Request() req
  ): Promise<CustomReportTemplate> {
    return this.biService.createTemplate({
      ...body,
      created_by_user_id: req.user.userId
    });
  }

  @Post('templates/:id/run')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async runReportJob(@Param('id') id: string): Promise<ReportJob> {
    return this.biService.runReportJob(id);
  }

  @Get('jobs/:id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getJobStatus(@Param('id') id: string): Promise<ReportJob> {
    return this.biService.getJobStatus(id);
  }

  @Get('jobs/completed')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async listCompletedJobs(): Promise<ReportJob[]> {
    return this.biService.listCompletedJobs();
  }
}
