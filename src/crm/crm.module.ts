import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { Quotation } from './quotation.entity';
import { Customer } from './customer.entity';
import { LeadService } from './lead.service';
import { QuotationService } from './quotation.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Quotation, Customer])],
  providers: [LeadService, QuotationService],
  controllers: [CrmController],
  exports: [LeadService, QuotationService, TypeOrmModule],
})
export class CrmModule {}
