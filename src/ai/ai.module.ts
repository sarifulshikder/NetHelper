// @ts-nocheck
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAiAnalyticsService } from './customer-ai-analytics.service';
import { SmartCopilotService } from './smart-copilot.service';
import { TelemetryAnomalyDetectorService } from './telemetry-anomaly-detector.service';
import { AiController } from './ai.controller';
import { CustomerChurnPrediction } from './entities/customer-churn-prediction.entity';
import { TelemetryAnomaly } from './entities/telemetry-anomaly.entity';
import { CrmModule } from '../crm/crm.module';
import { BillingModule } from '../billing/billing.module';
import { TicketsModule } from '../tickets/tickets.module';
import { HardwareModule } from '../hardware/hardware.module';
import { GisModule } from '../gis/gis.module';
import { PortalModule } from '../portal/portal.module';
import { OpenAiDriver } from './drivers/openai.driver';
import { SandboxAiDriver } from './drivers/sandbox-ai.driver';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerChurnPrediction, TelemetryAnomaly]),
    CrmModule,
    BillingModule,
    TicketsModule,
    HardwareModule,
    GisModule,
    PortalModule,
  ],
  providers: [
    CustomerAiAnalyticsService,
    SmartCopilotService,
    TelemetryAnomalyDetectorService,
    OpenAiDriver,
    SandboxAiDriver,
  ],
  controllers: [AiController],
  exports: [CustomerAiAnalyticsService, SmartCopilotService, TelemetryAnomalyDetectorService],
})
export class AiModule {}
