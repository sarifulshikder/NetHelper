// @ts-nocheck
import { Controller, Post, Body, Get, Param, UseGuards, Req, Query } from '@nestjs/common';
import { HardwareService } from './hardware.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { HardwareType, DeviceStatus } from './olt-device.entity';
import { OnuStatus } from './onu-device.entity';

@Controller('hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Post('olts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async createOltDevice(
    @Req() req: any,
    @Body() oltData: {
      name: string;
      ip_address: string;
      hardware_type?: HardwareType;
      snmp_community?: string;
      snmp_port?: number;
      ssh_username?: string;
      ssh_password?: string;
      ssh_port?: number;
      total_pon_ports?: number;
      location?: string;
      notes?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.createOltDevice(tenantSchema, oltData);
  }

  @Get('olts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllOltDevices(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getAllOltDevices(tenantSchema);
  }

  @Get('olts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOltDeviceById(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getOltDeviceById(tenantSchema, id);
  }

  @Put('olts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async updateOltDevice(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.updateOltDevice(tenantSchema, id, updateData);
  }

  @Delete('olts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async deleteOltDevice(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    await this.hardwareService.deleteOltDevice(tenantSchema, id);
    return { message: 'OLT device deleted successfully' };
  }

  @Get('olts/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOltStatus(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getOltStatus(tenantSchema, id);
  }

  @Get('olts/:id/unconfigured-onus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async discoverUnconfiguredOnus(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.discoverUnconfiguredOnus(tenantSchema, id);
  }

  @Post('onus/provision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async provisionOnu(
    @Req() req: any,
    @Body() provisionData: {
      olt_id: string;
      pon_port: number;
      onu_index: number;
      customer_id: string;
      profile_id: string;
      mac: string;
      serial: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.provisionOnu(
      tenantSchema,
      provisionData.olt_id,
      provisionData.pon_port,
      provisionData.onu_index,
      provisionData.customer_id,
      provisionData.profile_id,
      provisionData.mac,
      provisionData.serial,
    );
  }

  @Get('onus/:id/signal-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOnuSignalStatus(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getOnuSignalStatus(tenantSchema, id);
  }

  @Get('onus/:id/info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOnuInfo(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getOnuInfo(tenantSchema, id);
  }

  @Get('customers/:customerId/onus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOnusByCustomer(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getOnusByCustomer(tenantSchema, customerId);
  }

  @Get('olts/:oltId/onus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getOnusByOlt(@Req() req: any, @Param('oltId') oltId: string) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.getOnusByOlt(tenantSchema, oltId);
  }

  @Put('onus/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateOnuStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: { status: OnuStatus },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.hardwareService.updateOnuStatus(
      tenantSchema,
      id,
      statusData.status,
    );
  }
}
