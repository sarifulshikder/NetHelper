// @ts-nocheck
import { Controller, Post, Get, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TechnicianTaskStatus } from './entities/technician-task.entity';
import { TechnicianLocationActivityType } from './entities/technician-location-log.entity';

@Controller('technician')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechnicianController {
  constructor(private readonly technicianService: TechnicianService) {}

  @Get('tasks')
  @Roles('Staff')
  async getTasksForTechnician(@Req() req: any) {
    const technicianStaffId = req.user.id;
    return this.technicianService.getTasksForTechnician(technicianStaffId);
  }

  @Patch('tasks/:id/status')
  @Roles('Staff')
  async updateTaskStatus(
    @Param('id') taskId: string,
    @Body() body: { status: TechnicianTaskStatus },
    @Req() req: any,
  ) {
    const technicianStaffId = req.user.id;
    return this.technicianService.updateTaskStatus(
      taskId,
      body.status,
      technicianStaffId,
    );
  }

  @Post('tasks/:id/resolve')
  @Roles('Staff')
  async completeTechnicianTask(
    @Param('id') taskId: string,
    @Body() body: {
      resolution_notes: string;
      consumed_asset_instance_id: string;
    },
    @Req() req: any,
  ) {
    const technicianStaffId = req.user.id;
    return this.technicianService.completeTechnicianTask(
      taskId,
      body.resolution_notes,
      body.consumed_asset_instance_id,
      technicianStaffId,
    );
  }

  @Post('location')
  @Roles('Staff')
  async logTechnicianLocation(
    @Body() body: {
      task_id?: string;
      latitude: number;
      longitude: number;
      activity_type?: TechnicianLocationActivityType;
    },
    @Req() req: any,
  ) {
    const technicianStaffId = req.user.id;
    return this.technicianService.logTechnicianLocation({
      technician_staff_id: technicianStaffId,
      task_id: body.task_id,
      latitude: body.latitude,
      longitude: body.longitude,
      activity_type: body.activity_type,
    });
  }

  @Get('assets/custody')
  @Roles('Staff')
  async getAssetsInCustody(@Req() req: any) {
    const technicianStaffId = req.user.id;
    return this.technicianService.getAssetsInTechnicianCustody(technicianStaffId);
  }

  @Get('tasks/:id')
  @Roles('Staff')
  async getTechnicianTaskById(@Param('id') taskId: string, @Req() req: any) {
    const technicianStaffId = req.user.id;
    return this.technicianService.getTechnicianTaskById(taskId, technicianStaffId);
  }

  @Get('location/logs')
  @Roles('Staff')
  async getTechnicianLocationLogs(@Req() req: any) {
    const technicianStaffId = req.user.id;
    return this.technicianService.getTechnicianLocationLogs(technicianStaffId, 50);
  }

  @Get('location/task/:taskId')
  @Roles('Staff')
  async getLocationLogsForTask(@Param('taskId') taskId: string) {
    return this.technicianService.getLocationLogsForTask(taskId);
  }

  // Admin endpoints for task management
  @Post('tasks')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createTechnicianTask(
    @Body() body: {
      ticket_id: string;
      technician_staff_id: string;
      scheduled_at?: Date;
    },
  ) {
    return this.technicianService.createTechnicianTask(body);
  }

  @Get('tasks/all')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getAllTechnicianTasks() {
    return this.technicianTaskRepository.find({
      relations: ['ticket', 'technician'],
      order: { created_at: 'DESC' },
    });
  }

  @Get('location/all')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async getAllTechnicianLocationLogs() {
    return this.technicianService.getTechnicianLocationLogs();
  }
}
