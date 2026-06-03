// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TechnicianTask, TechnicianTaskStatus } from './entities/technician-task.entity';
import { TechnicianLocationLog, TechnicianLocationActivityType } from './entities/technician-location-log.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { RadiusService } from '../radius/radius.service';
import { AssetInstance, AssetStatus } from '../inventory/entities/asset-instance.entity';
import { Customer } from '../crm/customer.entity';

@Injectable()
export class TechnicianService {
  constructor(
    @InjectRepository(TechnicianTask)
    private technicianTaskRepository: Repository<TechnicianTask>,
    @InjectRepository(TechnicianLocationLog)
    private technicianLocationLogRepository: Repository<TechnicianLocationLog>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AssetInstance)
    private assetInstanceRepository: Repository<AssetInstance>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private inventoryService: InventoryService,
    private radiusService: RadiusService,
    private dataSource: DataSource,
  ) {}

  // Create a new technician task
  async createTechnicianTask(data: {
    ticket_id: string;
    technician_staff_id: string;
    scheduled_at?: Date;
  }): Promise<TechnicianTask> {
    const ticket = await this.ticketRepository.findOne({ where: { id: data.ticket_id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const technician = await this.userRepository.findOne({ where: { id: data.technician_staff_id } });
    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    const task = this.technicianTaskRepository.create(data);
    return await this.technicianTaskRepository.save(task);
  }

  // Get all tasks for a technician
  async getTasksForTechnician(technicianStaffId: string): Promise<TechnicianTask[]> {
    return await this.technicianTaskRepository.find({
      where: { technician_staff_id: technicianStaffId },
      relations: ['ticket', 'technician'],
      order: { created_at: 'DESC' },
    });
  }

  // Update task status
  async updateTaskStatus(
    taskId: string,
    status: TechnicianTaskStatus,
    technicianStaffId: string,
  ): Promise<TechnicianTask> {
    const task = await this.technicianTaskRepository.findOne({
      where: { id: taskId, technician_staff_id: technicianStaffId },
    });

    if (!task) {
      throw new NotFoundException('Task not found or not assigned to you');
    }

    // Validate status transitions
    const validTransitions: Record<TechnicianTaskStatus, TechnicianTaskStatus[]> = {
      [TechnicianTaskStatus.ASSIGNED]: [TechnicianTaskStatus.EN_ROUTE],
      [TechnicianTaskStatus.EN_ROUTE]: [TechnicianTaskStatus.ARRIVED],
      [TechnicianTaskStatus.ARRIVED]: [TechnicianTaskStatus.WORK_IN_PROGRESS],
      [TechnicianTaskStatus.WORK_IN_PROGRESS]: [TechnicianTaskStatus.COMPLETED, TechnicianTaskStatus.FAILED],
      [TechnicianTaskStatus.COMPLETED]: [],
      [TechnicianTaskStatus.FAILED]: [],
    };

    if (!validTransitions[task.status].includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${task.status} to ${status}`,
      );
    }

    // Update timestamps based on status
    if (status === TechnicianTaskStatus.WORK_IN_PROGRESS && !task.started_at) {
      task.started_at = new Date();
    }

    task.status = status;
    return await this.technicianTaskRepository.save(task);
  }

  // Complete technician task with asset deployment
  async completeTechnicianTask(
    taskId: string,
    resolutionNotes: string,
    consumedAssetInstanceId: string,
    technicianStaffId: string,
  ): Promise<{ task: TechnicianTask; asset: AssetInstance }> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Get the task
      const task = await transactionalEntityManager.findOne(TechnicianTask, {
        where: { id: taskId, technician_staff_id: technicianStaffId },
        relations: ['ticket'],
      });

      if (!task) {
        throw new NotFoundException('Task not found or not assigned to you');
      }

      if (task.status !== TechnicianTaskStatus.WORK_IN_PROGRESS) {
        throw new BadRequestException(
          `Task must be in WORK_IN_PROGRESS status to complete. Current status: ${task.status}`,
        );
      }

      // Get the asset instance
      const asset = await transactionalEntityManager.findOne(AssetInstance, {
        where: { id: consumedAssetInstanceId },
        relations: ['inventoryItem'],
      });

      if (!asset) {
        throw new NotFoundException('Asset instance not found');
      }

      if (asset.assigned_to_staff_id !== technicianStaffId) {
        throw new BadRequestException(
          'Asset is not in your custody. Cannot assign to customer.'
        );
      }

      if (asset.status !== AssetStatus.DISPATCHED_TO_TECH) {
        throw new BadRequestException(
          `Asset must be in DISPATCHED_TO_TECH status. Current status: ${asset.status}`
        );
      }

      // Get the customer from the ticket
      const customer = await transactionalEntityManager.findOne(Customer, {
        where: { id: task.ticket.customer_id },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found on ticket');
      }

      // Assign asset to customer using inventory service
      const updatedAsset = await this.inventoryService.assignAssetToCustomer(
        consumedAssetInstanceId,
        customer.id,
        technicianStaffId,
      );

      // Update task status and details
      task.status = TechnicianTaskStatus.COMPLETED;
      task.completed_at = new Date();
      task.resolution_notes = resolutionNotes;
      task.consumed_asset_instance_id = consumedAssetInstanceId;

      const completedTask = await transactionalEntityManager.save(TechnicianTask, task);

      // Update ticket status
      const ticket = task.ticket;
      ticket.status = TicketStatus.RESOLVED;
      await transactionalEntityManager.save(Ticket, ticket);

      // If this is an installation task, activate the customer in RADIUS
      if (task.ticket.type === 'INSTALLATION' && customer.email) {
        try {
          // Create RADIUS user for the customer
          await this.radiusService.createRadiusUser({
            username: customer.email,
            password: 'default123', // In production, this would be generated securely
            attributes: {
              'Simultaneous-Use': '1',
              'Framed-IP-Address': '192.168.1.100', // Placeholder, would be from IP pool
              'Framed-IP-Netmask': '255.255.255.0',
            },
          });

          // Mark customer as active
          customer.is_active = true;
          customer.activation_date = new Date();
          await transactionalEntityManager.save(Customer, customer);
        } catch (error) {
          // Log error but don't fail the transaction
          console.error('Failed to activate customer in RADIUS:', error.message);
        }
      }

      return { task: completedTask, asset: updatedAsset };
    });
  }

  // Log technician location
  async logTechnicianLocation(data: {
    technician_staff_id: string;
    task_id?: string;
    latitude: number;
    longitude: number;
    activity_type?: TechnicianLocationActivityType;
  }): Promise<TechnicianLocationLog> {
    const technician = await this.userRepository.findOne({ where: { id: data.technician_staff_id } });
    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    if (data.task_id) {
      const task = await this.technicianTaskRepository.findOne({ where: { id: data.task_id } });
      if (!task) {
        throw new NotFoundException('Task not found');
      }
    }

    const log = this.technicianLocationLogRepository.create(data);
    return await this.technicianLocationLogRepository.save(log);
  }

  // Get assets in technician's custody
  async getAssetsInTechnicianCustody(technicianStaffId: string): Promise<AssetInstance[]> {
    return await this.assetInstanceRepository.find({
      where: {
        assigned_to_staff_id: technicianStaffId,
        status: AssetStatus.DISPATCHED_TO_TECH,
      },
      relations: ['inventoryItem'],
    });
  }

  // Get technician task by ID
  async getTechnicianTaskById(
    taskId: string,
    technicianStaffId: string,
  ): Promise<TechnicianTask | null> {
    return await this.technicianTaskRepository.findOne({
      where: { id: taskId, technician_staff_id: technicianStaffId },
      relations: ['ticket', 'technician'],
    });
  }

  // Get location logs for technician
  async getTechnicianLocationLogs(
    technicianStaffId: string,
    limit?: number,
  ): Promise<TechnicianLocationLog[]> {
    const query = this.technicianLocationLogRepository
      .createQueryBuilder('log')
      .where('log.technician_staff_id = :technicianStaffId', { technicianStaffId })
      .leftJoinAndSelect('log.task', 'task')
      .orderBy('log.captured_at', 'DESC');

    if (limit) {
      query.limit(limit);
    }

    return await query.getMany();
  }

  // Get location logs for a specific task
  async getLocationLogsForTask(taskId: string): Promise<TechnicianLocationLog[]> {
    return await this.technicianLocationLogRepository.find({
      where: { task_id: taskId },
      relations: ['technician'],
      order: { captured_at: 'ASC' },
    });
  }
}
