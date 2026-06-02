import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SecurityService } from './security.service';
import { TenantSecurityProfile } from './tenant-security-profile.entity';
import { SecurityAuditEvent, SecurityEventType } from './security-audit-event.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async getSecurityProfile(@Request() req): Promise<TenantSecurityProfile> {
    return this.securityService.getSecurityProfile(req.headers['x-tenant-id']);
  }

  @Put('profile')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async updateSecurityProfile(
    @Request() req,
    @Body() updateData: {
      max_requests_per_minute?: number;
      max_concurrent_connections?: number;
      allow_public_signup?: boolean;
      webhook_ip_whitelist?: string[];
      status?: string;
    }
  ): Promise<TenantSecurityProfile> {
    return this.securityService.updateSecurityProfile(
      req.headers['x-tenant-id'],
      updateData
    );
  }

  @Get('audit-logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async listAuditLogs(
    @Request() req,
    @Body() filters?: {
      event_type?: SecurityEventType;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<SecurityAuditEvent[]> {
    return this.securityService.listAuditLogs(
      req.headers['x-tenant-id'],
      filters && {
        event_type: filters.event_type,
        start_date: filters.start_date ? new Date(filters.start_date) : undefined,
        end_date: filters.end_date ? new Date(filters.end_date) : undefined
      }
    );
  }
}
