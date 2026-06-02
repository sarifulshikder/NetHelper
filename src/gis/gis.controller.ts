import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { GisService } from './gis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PopStatus } from './entities/pop-device.entity';
import { FiberJointBoxStatus } from './entities/fiber-joint-box.entity';
import { FiberCableSourceType, FiberCableDestinationType, FiberCableStatus } from './entities/fiber-cable.entity';

@Controller('gis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GisController {
  constructor(private readonly gisService: GisService) {}

  @Post('pops')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createPop(
    @Body() body: {
      name: string;
      location_lat: number;
      location_long: number;
      address: string;
      total_capacity_cores: number;
      status?: PopStatus;
      notes?: string;
    },
  ) {
    return this.gisService.createPop(body);
  }

  @Post('zones')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createZone(
    @Body() body: {
      name: string;
      description?: string;
      pop_id: string;
    },
  ) {
    return this.gisService.createZone(body);
  }

  @Post('joint-boxes')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createJointBox(
    @Body() body: {
      pop_id: string;
      name: string;
      location_lat: number;
      location_long: number;
      total_ports: number;
      used_ports?: number;
      status?: FiberJointBoxStatus;
    },
  ) {
    return this.gisService.createJointBox(body);
  }

  @Post('cables')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createFiberCable(
    @Body() body: {
      name: string;
      source_type: FiberCableSourceType;
      source_id: string;
      destination_type: FiberCableDestinationType;
      destination_id: string;
      total_cores: number;
      color_code?: string;
      length_meters?: number;
      status?: FiberCableStatus;
    },
  ) {
    return this.gisService.createFiberCable(body);
  }

  @Get('trace/customer/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async traceFiberPath(@Param('id') customerId: string) {
    return this.gisService.traceFiberPath(customerId);
  }

  @Get('pops')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllPops() {
    return this.gisService.getAllPops();
  }

  @Get('joint-boxes')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllJointBoxes() {
    return this.gisService.getAllJointBoxes();
  }

  @Get('cables')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllFiberCables() {
    return this.gisService.getAllFiberCables();
  }

  @Get('pops/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getPopById(@Param('id') id: string) {
    return this.gisService.getPopById(id);
  }

  @Get('joint-boxes/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getJointBoxById(@Param('id') id: string) {
    return this.gisService.getJointBoxById(id);
  }

  @Get('cables/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getFiberCableById(@Param('id') id: string) {
    return this.gisService.getFiberCableById(id);
  }
}
