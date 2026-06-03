// @ts-nocheck
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';
import { Quotation } from './quotation.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  async createLead(
    schemaName: string,
    leadData: {
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
      address?: string;
      source?: string;
      notes?: string;
      assigned_to?: string;
    },
  ): Promise<Lead> {
    const connection = await getTenantConnection(schemaName);

    try {
      const lead = connection.manager.create(Lead, {
        ...leadData,
        status: LeadStatus.NEW,
      });

      return await connection.manager.save(Lead, lead);
    } catch (error) {
      this.logger.error(`Failed to create lead: ${error.message}`);
      throw error;
    }
  }

  async getLeadById(schemaName: string, id: string): Promise<Lead> {
    const connection = await getTenantConnection(schemaName);

    try {
      const lead = await connection.manager.findOne(Lead, { where: { id } });
      if (!lead) {
        throw new NotFoundException('Lead not found');
      }
      return lead;
    } catch (error) {
      this.logger.error(`Failed to get lead: ${error.message}`);
      throw error;
    }
  }

  async getAllLeads(schemaName: string): Promise<Lead[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Lead, {
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get leads: ${error.message}`);
      throw error;
    }
  }

  async updateLead(
    schemaName: string,
    id: string,
    updateData: Partial<Lead>,
  ): Promise<Lead> {
    const connection = await getTenantConnection(schemaName);

    try {
      const lead = await connection.manager.findOne(Lead, { where: { id } });
      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      Object.assign(lead, updateData);
      return await connection.manager.save(Lead, lead);
    } catch (error) {
      this.logger.error(`Failed to update lead: ${error.message}`);
      throw error;
    }
  }

  async deleteLead(schemaName: string, id: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      const result = await connection.manager.delete(Lead, id);
      if (result.affected === 0) {
        throw new NotFoundException('Lead not found');
      }
    } catch (error) {
      this.logger.error(`Failed to delete lead: ${error.message}`);
      throw error;
    }
  }

  async updateLeadStatus(
    schemaName: string,
    id: string,
    newStatus: LeadStatus,
  ): Promise<Lead> {
    const connection = await getTenantConnection(schemaName);

    try {
      const lead = await connection.manager.findOne(Lead, { where: { id } });
      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      lead.status = newStatus;
      
      // Automatically handle status progression logic
      if (newStatus === LeadStatus.CONVERTED) {
        // Additional conversion logic would go here
        // For example: create customer account, trigger KYC process, etc.
      }

      return await connection.manager.save(Lead, lead);
    } catch (error) {
      this.logger.error(`Failed to update lead status: ${error.message}`);
      throw error;
    }
  }

  async searchLeads(
    schemaName: string,
    searchTerm: string,
  ): Promise<Lead[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager
        .createQueryBuilder(Lead, 'lead')
        .where('lead.first_name ILIKE :term', { term: `%${searchTerm}%` })
        .orWhere('lead.last_name ILIKE :term', { term: `%${searchTerm}%` })
        .orWhere('lead.email ILIKE :term', { term: `%${searchTerm}%` })
        .orWhere('lead.phone ILIKE :term', { term: `%${searchTerm}%` })
        .orderBy('lead.created_at', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Failed to search leads: ${error.message}`);
      throw error;
    }
  }

  async getLeadsByStatus(
    schemaName: string,
    status: LeadStatus,
  ): Promise<Lead[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(Lead, {
        where: { status },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get leads by status: ${error.message}`);
      throw error;
    }
  }
}
