// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { TenantSecurityProfile } from './tenant-security-profile.entity';
import { SecurityAuditEvent } from './security-audit-event.entity';
import { TenantThrottlerGuard } from './tenant-throttler.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantSecurityProfile, SecurityAuditEvent])
  ],
  controllers: [SecurityController],
  providers: [SecurityService, TenantThrottlerGuard],
  exports: [SecurityService, TenantThrottlerGuard]
})
export class SecurityModule {}
