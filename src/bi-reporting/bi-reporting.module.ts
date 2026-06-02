import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiReportingService } from './bi-reporting.service';
import { BiReportingController } from './bi-reporting.controller';
import { CustomReportTemplate } from './custom-report-template.entity';
import { ReportJob } from './report-job.entity';
import { CsvFormatter } from './formatters/csv-formatter';
import { LedgerFormatter } from './formatters/ledger-formatter';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomReportTemplate, ReportJob])
  ],
  controllers: [BiReportingController],
  providers: [BiReportingService, CsvFormatter, LedgerFormatter],
  exports: [BiReportingService]
})
export class BiReportingModule {}
