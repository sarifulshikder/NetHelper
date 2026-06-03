// @ts-nocheck
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSecurityProfile } from './tenant-security-profile.entity';
import { SecurityAuditEvent, SecurityEventType } from './security-audit-event.entity';
import { Request } from 'express';

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(TenantSecurityProfile)
    private securityProfileRepository: Repository<TenantSecurityProfile>,
    @InjectRepository(SecurityAuditEvent)
    private auditEventRepository: Repository<SecurityAuditEvent>
  ) {}

  async getSecurityProfile(tenantId: string): Promise<TenantSecurityProfile> {
    const profile = await this.securityProfileRepository.findOne({
      where: { tenant_id: tenantId }
    });
    if (!profile) {
      throw new NotFoundException('Security profile not found');
    }
    return profile;
  }

  async updateSecurityProfile(
    tenantId: string,
    updateData: {
      max_requests_per_minute?: number;
      max_concurrent_connections?: number;
      allow_public_signup?: boolean;
      webhook_ip_whitelist?: string[];
      status?: string;
    }
  ): Promise<TenantSecurityProfile> {
    const profile = await this.getSecurityProfile(tenantId);
    
    Object.assign(profile, updateData);
    return this.securityProfileRepository.save(profile);
  }

  async validateWebhookIp(tenantId: string, request: Request): Promise<boolean> {
    const profile = await this.getSecurityProfile(tenantId);
    const clientIp = this.getClientIp(request);
    
    // If whitelist is empty, allow all
    if (!profile.webhook_ip_whitelist || profile.webhook_ip_whitelist.length === 0) {
      return true;
    }
    
    // Check if IP is in whitelist
    const isAllowed = profile.webhook_ip_whitelist.some(ip => {
      // Support both exact IP and CIDR notation (simple implementation)
      if (ip.includes('/')) {
        // Basic CIDR check (simplified - production would use proper IP library)
        const [baseIp] = ip.split('/');
        return clientIp === baseIp;
      }
      return clientIp === ip;
    });
    
    if (!isAllowed) {
      // Log unauthorized access attempt
      await this.logSecurityEvent({
        tenant_id: tenantId,
        event_type: SecurityEventType.UNAUTHORIZED_IP,
        ip_address: clientIp,
        request_path: request.path,
        payload_summary: JSON.stringify({
          method: request.method,
          headers: request.headers
        })
      });
    }
    
    return isAllowed;
  }

  async listAuditLogs(
    tenantId: string,
    filters?: {
      event_type?: SecurityEventType;
      start_date?: Date;
      end_date?: Date;
    }
  ): Promise<SecurityAuditEvent[]> {
    const query = this.auditEventRepository
      .createQueryBuilder('event')
      .where('event.tenant_id = :tenantId', { tenantId });
    
    if (filters?.event_type) {
      query.andWhere('event.event_type = :eventType', { eventType: filters.event_type });
    }
    
    if (filters?.start_date) {
      query.andWhere('event.created_at >= :startDate', { startDate: filters.start_date });
    }
    
    if (filters?.end_date) {
      query.andWhere('event.created_at <= :endDate', { endDate: filters.end_date });
    }
    
    return query
      .orderBy('event.created_at', 'DESC')
      .getMany();
  }

  private getClientIp(request: Request): string {
    return request.ip || 
           request.headers['x-forwarded-for']?.toString().split(',')[0] || 
           request.connection.remoteAddress || 
           'unknown';
  }

  private async logSecurityEvent(eventData: {
    tenant_id: string;
    event_type: SecurityEventType;
    ip_address: string;
    request_path: string;
    payload_summary?: string;
  }): Promise<SecurityAuditEvent> {
    const event = this.auditEventRepository.create(eventData);
    return this.auditEventRepository.save(event);
  }
}
