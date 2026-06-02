import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { TenantService } from '../tenants/tenant.service';
import { RadiusService } from '../radius/radius.service';
import { GisService } from '../gis/gis.service';
import { BillingService } from '../billing/billing.service';
import { AiService } from '../ai/ai.service';
import { SecurityService } from '../security/security.service';

@Injectable()
export class SystemDiagnosticService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private tenantService: TenantService,
    private radiusService: RadiusService,
    private gisService: GisService,
    private billingService: BillingService,
    private aiService: AiService,
    private securityService: SecurityService
  ) {}

  async runSystemSmokeTest(tenantId: string): Promise<{
    status: 'PASS' | 'FAIL';
    checks: Array<{ name: string; status: 'PASS' | 'FAIL'; error?: string }>;
  }> {
    const checks = [];

    try {
      // Check tenant routing
      const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      checks.push({ name: 'Tenant Routing', status: 'PASS' });

      // Check RADIUS configuration
      try {
        const radiusUsers = await this.radiusService.getRadiusUsers(tenantId);
        checks.push({ name: 'RADIUS Configuration', status: 'PASS' });
      } catch (error) {
        checks.push({ name: 'RADIUS Configuration', status: 'FAIL', error: error.message });
      }

      // Check GIS calculation
      try {
        const distance = this.gisService.calculateDistance(
          { latitude: 23.75, longitude: 90.39 },
          { latitude: 23.76, longitude: 90.40 }
        );
        if (typeof distance === 'number' && distance > 0) {
          checks.push({ name: 'GIS Haversine Calculation', status: 'PASS' });
        } else {
          checks.push({ name: 'GIS Haversine Calculation', status: 'FAIL', error: 'Invalid distance calculation' });
        }
      } catch (error) {
        checks.push({ name: 'GIS Haversine Calculation', status: 'FAIL', error: error.message });
      }

      // Check billing summary
      try {
        const summary = await this.billingService.getBillingSummary(tenantId);
        if (summary && typeof summary.total_revenue === 'number') {
          checks.push({ name: 'Billing Summary', status: 'PASS' });
        } else {
          checks.push({ name: 'Billing Summary', status: 'FAIL', error: 'Invalid summary data' });
        }
      } catch (error) {
        checks.push({ name: 'Billing Summary', status: 'FAIL', error: error.message });
      }

      // Check AI driver
      try {
        const response = await this.aiService.analyzeTicketContent(
          tenantId,
          'Test ticket content for smoke test'
        );
        if (response && response.analysis) {
          checks.push({ name: 'AI Sandbox Driver', status: 'PASS' });
        } else {
          checks.push({ name: 'AI Sandbox Driver', status: 'FAIL', error: 'Invalid AI response' });
        }
      } catch (error) {
        checks.push({ name: 'AI Sandbox Driver', status: 'FAIL', error: error.message });
      }

      // Check throttler state
      try {
        const profile = await this.securityService.getSecurityProfile(tenantId);
        if (profile && profile.max_requests_per_minute > 0) {
          checks.push({ name: 'Security Throttler', status: 'PASS' });
        } else {
          checks.push({ name: 'Security Throttler', status: 'FAIL', error: 'Invalid throttler configuration' });
        }
      } catch (error) {
        checks.push({ name: 'Security Throttler', status: 'FAIL', error: error.message });
      }

      // Determine overall status
      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const status = failedChecks.length > 0 ? 'FAIL' : 'PASS';

      return { status, checks };
    } catch (error) {
      return {
        status: 'FAIL',
        checks: [{ name: 'System Smoke Test', status: 'FAIL', error: error.message }]
      };
    }
  }

  async getSystemHealthReport(): Promise<{
    total_tenants: number;
    global_uptime_seconds: number;
    total_network_devices: number;
  }> {
    const totalTenants = await this.tenantRepository.count();
    
    // Calculate uptime (simulated)
    const uptimeSeconds = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / 1000);
    
    // Count network devices (simulated)
    const totalDevices = totalTenants * 7; // Average 7 devices per tenant
    
    return {
      total_tenants: totalTenants,
      global_uptime_seconds: uptimeSeconds,
      total_network_devices: totalDevices
    };
  }
}
