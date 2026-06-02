import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant identifier from headers
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantDomain = req.headers['x-tenant-domain'] as string;

    if (tenantId) {
      try {
        const schemaName = await this.tenantService.getTenantSchema(tenantId);
        req['tenantSchema'] = schemaName;
      } catch (error) {
        console.error('Tenant not found:', error.message);
        return res.status(404).json({ message: 'Tenant not found' });
      }
    } else if (tenantDomain) {
      try {
        const tenant = await this.tenantService.findTenantByDomain(tenantDomain);
        if (tenant) {
          req['tenantSchema'] = tenant.schema_name;
        }
      } catch (error) {
        console.error('Tenant not found:', error.message);
        return res.status(404).json({ message: 'Tenant not found' });
      }
    } else {
      // Default to public schema if no tenant identifier provided
      req['tenantSchema'] = 'public';
    }

    next();
  }
}
