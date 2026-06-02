import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req, Query } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { SlaService } from './sla.service';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { TicketStatus, TicketPriority, TicketCategory } from './ticket.entity';
import { MaintenanceStatus } from './maintenance-schedule.entity';

@Controller('tickets')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly slaService: SlaService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async createTicket(
    @Req() req: any,
    @Body() ticketData: {
      customer_id?: string;
      title: string;
      description: string;
      category?: TicketCategory;
      priority?: TicketPriority;
      zone_or_pop?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    const createdBy = req.user.userId;
    
    return this.ticketService.createTicket(tenantSchema, {
      ...ticketData,
      created_by: createdBy,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllTickets(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.getAllTickets(tenantSchema);
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAssignedTickets(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    const staffId = req.user.userId;
    return this.ticketService.getTicketsByStaff(tenantSchema, staffId);
  }

  @Get('customer/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getTicketsByCustomer(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.getTicketsByCustomer(tenantSchema, customerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getTicketById(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.getTicketById(tenantSchema, id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateTicketStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: {
      status: TicketStatus;
      comment?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    const updatedBy = req.user.userId;
    
    return this.ticketService.updateTicketStatus(
      tenantSchema,
      id,
      statusData.status,
      updatedBy,
      statusData.comment,
    );
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async assignTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() assignData: { staff_id: string },
  ) {
    const tenantSchema = req.tenantSchema;
    const assignedBy = req.user.userId;
    
    return this.ticketService.assignTicket(
      tenantSchema,
      id,
      assignData.staff_id,
      assignedBy,
    );
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async addComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() commentData: { comment: string },
  ) {
    const tenantSchema = req.tenantSchema;
    const userId = req.user.userId;
    
    return this.ticketService.addComment(
      tenantSchema,
      id,
      userId,
      commentData.comment,
    );
  }

  @Put(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async resolveTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() resolutionData: { resolution_notes: string },
  ) {
    const tenantSchema = req.tenantSchema;
    const resolvedBy = req.user.userId;
    
    return this.ticketService.resolveTicket(
      tenantSchema,
      id,
      resolvedBy,
      resolutionData.resolution_notes,
    );
  }

  @Put(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async closeTicket(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    const closedBy = req.user.userId;
    
    return this.ticketService.closeTicket(tenantSchema, id, closedBy);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getTicketsByStatus(
    @Req() req: any,
    @Param('status') status: TicketStatus,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.getTicketsByStatus(tenantSchema, status);
  }

  @Get('sla/breached')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getSlaBreachedTickets(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.getSlaBreachedTickets(tenantSchema);
  }

  @Get('sla/compliance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async getSlaComplianceStats(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.slaService.getSlaComplianceStats(tenantSchema);
  }

  @Get('sla/approaching')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getTicketsApproachingSla(
    @Req() req: any,
    @Query('hours') hoursThreshold: number = 2,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.slaService.getTicketsApproachingSla(tenantSchema, hoursThreshold);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getTicketHistory(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.getTicketHistory(tenantSchema, id);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async searchTickets(@Req() req: any, @Query('q') searchTerm: string) {
    const tenantSchema = req.tenantSchema;
    return this.ticketService.searchTickets(tenantSchema, searchTerm);
  }

  // Maintenance endpoints
  @Post('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async createMaintenanceSchedule(
    @Req() req: any,
    @Body() maintenanceData: {
      title: string;
      description: string;
      affected_pops_or_zones: string;
      start_time: Date;
      end_time: Date;
      notes?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    const createdBy = req.user.userId;
    
    return this.maintenanceService.createMaintenanceSchedule(tenantSchema, {
      ...maintenanceData,
      created_by: createdBy,
    });
  }

  @Get('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllMaintenanceSchedules(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.maintenanceService.getAllMaintenanceSchedules(tenantSchema);
  }

  @Get('maintenance/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getUpcomingMaintenance(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.maintenanceService.getUpcomingMaintenance(tenantSchema);
  }

  @Get('maintenance/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getActiveMaintenance(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.maintenanceService.getActiveMaintenance(tenantSchema);
  }

  @Put('maintenance/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async updateMaintenanceStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: { status: MaintenanceStatus },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.maintenanceService.updateMaintenanceStatus(
      tenantSchema,
      id,
      statusData.status,
    );
  }

  @Get('maintenance/zone/:zoneOrPop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getMaintenanceByZone(
    @Req() req: any,
    @Param('zoneOrPop') zoneOrPop: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.maintenanceService.getMaintenanceByZone(tenantSchema, zoneOrPop);
  }

  @Get('maintenance/:id/affected-customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAffectedCustomers(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const tenantSchema = req.tenantSchema;
    const maintenance = await this.maintenanceService.getMaintenanceScheduleById(
      tenantSchema,
      id,
    );
    
    return this.maintenanceService.getAffectedCustomers(
      tenantSchema,
      maintenance.affected_pops_or_zones,
    );
  }
}
