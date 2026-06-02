import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './tenant.middleware';
import { TenantDataService } from './tenant-data.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantService, TenantMiddleware, TenantDataService],
  controllers: [TenantController],
  exports: [TenantService, TenantMiddleware, TenantDataService],
})
export class TenantModule {}
