// @ts-nocheck
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MikrotikService } from './mikrotik.service';
import { RadiusService } from '../radius/radius.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('network')
export class NetworkController {
  constructor(
    private readonly mikrotikService: MikrotikService,
    private readonly radiusService: RadiusService,
  ) {}

  @Post('mikrotik/test-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async testMikrotikConnection(
    @Body() connectionDto: {
      host: string;
      port: number;
      username: string;
      password: string;
      useSSH?: boolean;
    },
  ) {
    return this.mikrotikService.testConnection(
      connectionDto.host,
      connectionDto.port,
      connectionDto.username,
      connectionDto.password,
      connectionDto.useSSH || false,
    );
  }

  @Post('mikrotik/resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async getRouterResources(
    @Body() connectionDto: {
      host: string;
      port: number;
      username: string;
      password: string;
      useSSH?: boolean;
    },
  ) {
    return this.mikrotikService.getRouterResources(
      connectionDto.host,
      connectionDto.port,
      connectionDto.username,
      connectionDto.password,
      connectionDto.useSSH || false,
    );
  }

  @Post('mikrotik/ip-pool')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async addIPPool(
    @Body() poolDto: {
      host: string;
      port: number;
      username: string;
      password: string;
      poolName: string;
      poolRange: string;
      useSSH?: boolean;
    },
  ) {
    return this.mikrotikService.addIPPool(
      poolDto.host,
      poolDto.port,
      poolDto.username,
      poolDto.password,
      poolDto.poolName,
      poolDto.poolRange,
      poolDto.useSSH || false,
    );
  }

  @Post('radius/create-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async createRadiusUser(
    @Req() req: any,
    @Body() userDto: {
      username: string;
      password: string;
      profileAttributes?: { [key: string]: string };
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.radiusService.createRadiusUser(
      tenantSchema,
      userDto.username,
      userDto.password,
      userDto.profileAttributes || {},
    );
  }

  @Post('radius/disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async disconnectUser(
    @Body() disconnectDto: {
      nasIp: string;
      nasPort: number;
      username: string;
      secret?: string;
    },
  ) {
    return this.radiusService.disconnectUser(
      disconnectDto.nasIp,
      disconnectDto.nasPort,
      disconnectDto.username,
      disconnectDto.secret || 'testing123',
    );
  }

  @Post('radius/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async getActiveSessions(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.radiusService.getActiveSessions(tenantSchema);
  }
}
