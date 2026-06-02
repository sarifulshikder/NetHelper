import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSeederService } from './system-seeder.service';
import { SystemDiagnosticService } from './system-diagnostic.service';
import { SystemController } from './system.controller';
import { Tenant } from '../tenants/tenant.entity';
import { TenantService } from '../tenants/tenant.service';
import { RadiusService } from '../radius/radius.service';
import { GisService } from '../gis/gis.service';
import { BillingService } from '../billing/billing.service';
import { AiService } from '../ai/ai.service';
import { SecurityService } from '../security/security.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [SystemController],
  providers: [
    SystemSeederService,
    SystemDiagnosticService,
    TenantService,
    RadiusService,
    GisService,
    BillingService,
    AiService,
    SecurityService
  ],
  exports: [SystemSeederService, SystemDiagnosticService]
})
export class SystemModule {}
