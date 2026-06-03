// @ts-nocheck
// @ts-nocheck
import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { SystemSeederService } from './system-seeder.service';
import { SystemDiagnosticService } from './system-diagnostic.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(
    private readonly seederService: SystemSeederService,
    private readonly diagnosticService: SystemDiagnosticService
  ) {}

  @Post('seed-sandbox')
  @Roles(UserRole.SUPER_ADMIN)
  async seedSandbox(@Request() req): Promise<{ success: boolean; tenantsCreated: number }> {
    return this.seederService.seedSandboxTenants();
  }

  @Get('smoke-test')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async runSmokeTest(@Request() req): Promise<{
    status: 'PASS' | 'FAIL';
    checks: Array<{ name: string; status: 'PASS' | 'FAIL'; error?: string }>;
  }> {
    return this.diagnosticService.runSystemSmokeTest(req.headers['x-tenant-id']);
  }

  @Get('health-report')
  @Roles(UserRole.SUPER_ADMIN)
  async getHealthReport(): Promise<{
    total_tenants: number;
    global_uptime_seconds: number;
    total_network_devices: number;
  }> {
    return this.diagnosticService.getSystemHealthReport();
  }
}
