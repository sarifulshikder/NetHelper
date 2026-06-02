import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { CustomReportTemplate, EntityType } from './custom-report-template.entity';
import { ReportJob, JobStatus } from './report-job.entity';
import { CsvFormatter } from './formatters/csv-formatter';
import { LedgerFormatter } from './formatters/ledger-formatter';
import { writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class BiReportingService {
  constructor(
    @InjectRepository(CustomReportTemplate)
    private templateRepository: Repository<CustomReportTemplate>,
    @InjectRepository(ReportJob)
    private jobRepository: Repository<ReportJob>,
    private csvFormatter: CsvFormatter,
    private ledgerFormatter: LedgerFormatter,
    private dataSource: DataSource
  ) {}

  async createTemplate(templateData: {
    name: string;
    entity_type: EntityType;
    selected_fields: string[];
    filter_conditions?: any;
    created_by_user_id: string;
  }): Promise<CustomReportTemplate> {
    const template = this.templateRepository.create(templateData);
    return this.templateRepository.save(template);
  }

  async getTemplateById(id: string): Promise<CustomReportTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async runReportJob(templateId: string): Promise<ReportJob> {
    const template = await this.getTemplateById(templateId);

    // Create job in QUEUED status
    const job = this.jobRepository.create({
      template_id: templateId,
      status: JobStatus.QUEUED,
      total_records_processed: 0
    });
    const savedJob = await this.jobRepository.save(job);

    // Process asynchronously
    this.processReportJob(savedJob).catch(error => {
      console.error('Report job processing failed:', error);
    });

    return savedJob;
  }

  private async processReportJob(job: ReportJob): Promise<void> {
    try {
      // Update status to PROCESSING
      await this.jobRepository.update(job.id, {
        status: JobStatus.PROCESSING
      });

      const template = await this.getTemplateById(job.template_id);
      const chunkSize = 1000;
      let offset = 0;
      let totalProcessed = 0;
      const results: any[] = [];

      // Get the repository for the target entity
      const entityRepository = this.dataSource.getRepository(
        this.getEntityName(template.entity_type)
      );

      // Build query with filters
      const queryBuilder = entityRepository.createQueryBuilder('entity');

      // Apply filter conditions if present
      if (template.filter_conditions?.where) {
        Object.entries(template.filter_conditions.where).forEach(([field, value]) => {
          queryBuilder.andWhere(`entity.${field} = :${field}`, { [field]: value });
        });
      }

      // Process in chunks to prevent OOM
      while (true) {
        const chunk = await queryBuilder
          .select(template.selected_fields.map(f => `entity.${f}`))
          .skip(offset)
          .take(chunkSize)
          .getRawMany();

        if (chunk.length === 0) {
          break;
        }

        results.push(...chunk);
        totalProcessed += chunk.length;
        offset += chunkSize;

        // Update progress
        await this.jobRepository.update(job.id, {
          total_records_processed: totalProcessed
        });
      }

      // Format the data
      const formattedData = this.formatData(results, template);

      // Save to file
      const filePath = this.generateFilePath(job.id, template);
      writeFileSync(filePath, formattedData, 'utf-8');

      // Update job as completed
      await this.jobRepository.update(job.id, {
        status: JobStatus.COMPLETED,
        file_path_or_url: filePath
      });

    } catch (error) {
      console.error('Error processing report job:', error);
      await this.jobRepository.update(job.id, {
        status: JobStatus.FAILED,
        error_log: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private formatData(data: any[], template: CustomReportTemplate): string {
    switch (template.entity_type) {
      case EntityType.REVENUE:
      case EntityType.TICKETS:
      case EntityType.INVENTORY:
        return this.csvFormatter.format(data, template.selected_fields);
      case EntityType.CUSTOMERS:
        return this.ledgerFormatter.format(data, template.selected_fields);
      default:
        return this.csvFormatter.format(data, template.selected_fields);
    }
  }

  private generateFilePath(jobId: string, template: CustomReportTemplate): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${template.entity_type}_${jobId}_${timestamp}.csv`;
    return join('/tmp/reports', fileName);
  }

  private getEntityName(entityType: EntityType): string {
    switch (entityType) {
      case EntityType.REVENUE: return 'invoice';
      case EntityType.TICKETS: return 'ticket';
      case EntityType.INVENTORY: return 'inventory_item';
      case EntityType.CUSTOMERS: return 'customer';
      default: return 'invoice';
    }
  }

  async getJobStatus(jobId: string): Promise<ReportJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async listCompletedJobs(): Promise<ReportJob[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.COMPLETED },
      order: { created_at: 'DESC' }
    });
  }
}
