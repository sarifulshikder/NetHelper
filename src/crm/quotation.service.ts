// @ts-nocheck
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Quotation, QuotationStatus } from './quotation.entity';
import { Lead } from './lead.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class QuotationService {
  private readonly logger = new Logger(QuotationService.name);

  constructor(
    @InjectRepository(Quotation)
    private quotationRepository: Repository<Quotation>,
  ) {}

  async createQuotation(
    schemaName: string,
    quotationData: {
      lead_id: string;
      service_plan_id: string;
      price_quoted: number;
      validity_days: number;
      terms_conditions?: string;
    },
  ): Promise<Quotation> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Verify lead exists
      const lead = await connection.manager.findOne(Lead, {
        where: { id: quotationData.lead_id },
      });
      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      const quotation = connection.manager.create(Quotation, {
        ...quotationData,
        status: QuotationStatus.DRAFT,
      });

      return await connection.manager.save(Quotation, quotation);
    } catch (error) {
      this.logger.error(`Failed to create quotation: ${error.message}`);
      throw error;
    }
  }

  async getQuotationById(schemaName: string, id: string): Promise<Quotation> {
    const connection = await getTenantConnection(schemaName);

    try {
      const quotation = await connection.manager.findOne(Quotation, {
        where: { id },
        relations: ['lead'],
      });
      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }
      return quotation;
    } catch (error) {
      this.logger.error(`Failed to get quotation: ${error.message}`);
      throw error;
    }
  }

  async getQuotationsByLeadId(
    schemaName: string,
    leadId: string,
  ): Promise<Quotation[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Quotation, {
        where: { lead_id: leadId },
        relations: ['lead'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get quotations by lead: ${error.message}`);
      throw error;
    }
  }

  async updateQuotation(
    schemaName: string,
    id: string,
    updateData: Partial<Quotation>,
  ): Promise<Quotation> {
    const connection = await getTenantConnection(schemaName);

    try {
      const quotation = await connection.manager.findOne(Quotation, {
        where: { id },
      });
      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      Object.assign(quotation, updateData);
      return await connection.manager.save(Quotation, quotation);
    } catch (error) {
      this.logger.error(`Failed to update quotation: ${error.message}`);
      throw error;
    }
  }

  async updateQuotationStatus(
    schemaName: string,
    id: string,
    newStatus: QuotationStatus,
  ): Promise<Quotation> {
    const connection = await getTenantConnection(schemaName);

    try {
      const quotation = await connection.manager.findOne(Quotation, {
        where: { id },
      });
      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      quotation.status = newStatus;

      // Handle status-specific logic
      if (newStatus === QuotationStatus.ACCEPTED) {
        quotation.accepted_at = new Date();
      } else if (newStatus === QuotationStatus.EXPIRED) {
        quotation.expired_at = new Date();
      }

      return await connection.manager.save(Quotation, quotation);
    } catch (error) {
      this.logger.error(`Failed to update quotation status: ${error.message}`);
      throw error;
    }
  }

  async deleteQuotation(schemaName: string, id: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      const result = await connection.manager.delete(Quotation, id);
      if (result.affected === 0) {
        throw new NotFoundException('Quotation not found');
      }
    } catch (error) {
      this.logger.error(`Failed to delete quotation: ${error.message}`);
      throw error;
    }
  }

  async checkQuotationExpiry(schemaName: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();
      const quotations = await connection.manager
        .createQueryBuilder(Quotation, 'quotation')
        .where('quotation.status = :status', { status: QuotationStatus.SENT })
        .andWhere('quotation.created_at + (quotation.validity_days || 0) * INTERVAL \'1 day\' < :now', {
          now: now.toISOString(),
        })
        .getMany();

      for (const quotation of quotations) {
        quotation.status = QuotationStatus.EXPIRED;
        quotation.expired_at = now;
        await connection.manager.save(Quotation, quotation);
      }
    } catch (error) {
      this.logger.error(`Failed to check quotation expiry: ${error.message}`);
      throw error;
    }
  }

  async getQuotationsByStatus(
    schemaName: string,
    status: QuotationStatus,
  ): Promise<Quotation[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Quotation, {
        where: { status },
        relations: ['lead'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get quotations by status: ${error.message}`);
      throw error;
    }
  }
}
