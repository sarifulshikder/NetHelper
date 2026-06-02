import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSecurityProfile } from './tenant-security-profile.entity';
import { SecurityAuditEvent, SecurityEventType } from './security-audit-event.entity';
import { Request } from 'express';

@Injectable()
export class TenantThrottlerGuard implements CanActivate {
  private rateLimitCache: Map<string, { count: number; timestamp: number }> = new Map();

  constructor(
    @InjectRepository(TenantSecurityProfile)
    private securityProfileRepository: Repository<TenantSecurityProfile>,
    @InjectRepository(SecurityAuditEvent)
    private auditEventRepository: Repository<SecurityAuditEvent>,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return true; // Let other guards handle authentication
    }

    // Get tenant's security profile
    const profile = await this.securityProfileRepository.findOne({
      where: { tenant_id: tenantId }
    });

    if (!profile || profile.status !== 'ACTIVE') {
      return true; // No profile means no rate limiting
    }

    const ip = this.getClientIp(request);
    const key = `${tenantId}:${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Initialize or reset counter
    if (!this.rateLimitCache.has(key) || now - this.rateLimitCache.get(key).timestamp > windowMs) {
      this.rateLimitCache.set(key, { count: 1, timestamp: now });
    } else {
      const entry = this.rateLimitCache.get(key);
      entry.count++;
      this.rateLimitCache.set(key, entry);

      // Check if rate limit exceeded
      if (entry.count > profile.max_requests_per_minute) {
        // Log security event
        await this.logSecurityEvent({
          tenant_id: tenantId,
          event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          ip_address: ip,
          request_path: request.path,
          payload_summary: JSON.stringify({
            method: request.method,
            headers: request.headers
          })
        });

        throw new ForbiddenException({
          statusCode: 429,
          message: 'Too many requests',
          details: `Rate limit of ${profile.max_requests_per_minute} requests per minute exceeded`
        });
      }
    }

    return true;
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
