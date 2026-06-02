import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { MaintenanceSchedule, MaintenanceStatus } from './maintenance-schedule.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceSchedule)
    private maintenanceRepository: Repository<MaintenanceSchedule>,
  ) {}

  async createMaintenanceSchedule(
    schemaName: string,
    maintenanceData: {
      title: string;
      description: string;
      affected_pops_or_zones: string;
      start_time: Date;
      end_time: Date;
      created_by: string;
      notes?: string;
    },
  ): Promise<MaintenanceSchedule> {
    const connection = await getTenantConnection(schemaName);

    try {
      const maintenance = connection.manager.create(MaintenanceSchedule, {
        ...maintenanceData,
        status: MaintenanceStatus.SCHEDULED,
      });

      return await connection.manager.save(MaintenanceSchedule, maintenance);
    } catch (error) {
      this.logger.error(`Failed to create maintenance schedule: ${error.message}`);
      throw error;
    }
  }

  async getMaintenanceScheduleById(
    schemaName: string,
    id: string,
  ): Promise<MaintenanceSchedule> {
    const connection = await getTenantConnection(schemaName);

    try {
      const maintenance = await connection.manager.findOne(MaintenanceSchedule, {
        where: { id },
      });

      if (!maintenance) {
        throw new NotFoundException('Maintenance schedule not found');
      }

      return maintenance;
    } catch (error) {
      this.logger.error(`Failed to get maintenance schedule: ${error.message}`);
      throw error;
    }
  }

  async getAllMaintenanceSchedules(schemaName: string): Promise<MaintenanceSchedule[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(MaintenanceSchedule, {
        order: { start_time: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get maintenance schedules: ${error.message}`);
      throw error;
    }
  }

  async getUpcomingMaintenance(schemaName: string): Promise<MaintenanceSchedule[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();

      return await connection.manager.find(MaintenanceSchedule, {
        where: {
          start_time: MoreThan(now),
          status: MaintenanceStatus.SCHEDULED,
        },
        order: { start_time: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get upcoming maintenance: ${error.message}`);
      throw error;
    }
  }

  async getActiveMaintenance(schemaName: string): Promise<MaintenanceSchedule[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const now = new Date();

      return await connection.manager.find(MaintenanceSchedule, {
        where: {
          start_time: LessThanOrEqual(now),
          end_time: MoreThan(now),
          status: MaintenanceStatus.IN_PROGRESS,
        },
        order: { start_time: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get active maintenance: ${error.message}`);
      throw error;
    }
  }

  async updateMaintenanceStatus(
    schemaName: string,
    id: string,
    status: MaintenanceStatus,
  ): Promise<MaintenanceSchedule> {
    const connection = await getTenantConnection(schemaName);

    try {
      const maintenance = await connection.manager.findOne(MaintenanceSchedule, {
        where: { id },
      });

      if (!maintenance) {
        throw new NotFoundException('Maintenance schedule not found');
      }

      maintenance.status = status;

      return await connection.manager.save(MaintenanceSchedule, maintenance);
    } catch (error) {
      this.logger.error(`Failed to update maintenance status: ${error.message}`);
      throw error;
    }
  }

  async deleteMaintenanceSchedule(schemaName: string, id: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      const result = await connection.manager.delete(MaintenanceSchedule, id);
      if (result.affected === 0) {
        throw new NotFoundException('Maintenance schedule not found');
      }
    } catch (error) {
      this.logger.error(`Failed to delete maintenance schedule: ${error.message}`);
      throw error;
    }
  }

  async getAffectedCustomers(
    schemaName: string,
    zoneOrPop: string,
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    const connection = await getTenantConnection(schemaName);

    try {
      // In a real system, this would query the Customer entity
      // For this implementation, we'll return a simulated response
      return [
        {
          id: 'cust_123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        {
          id: 'cust_456',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      ];
    } catch (error) {
      this.logger.error(`Failed to get affected customers: ${error.message}`);
      throw error;
    }
  }

  async getMaintenanceByZone(
    schemaName: string,
    zoneOrPop: string,
  ): Promise<MaintenanceSchedule[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(MaintenanceSchedule, {
        where: {
          affected_pops_or_zones: Like(`%${zoneOrPop}%`),
        },
        order: { start_time: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get maintenance by zone: ${error.message}`);
      throw error;
    }
  }
}
