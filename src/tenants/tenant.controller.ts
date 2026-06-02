import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantDataService } from './tenant-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantDataService: TenantDataService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN)
  async createTenant(
    @Body() createTenantDto: { name: string; companyName: string; domain: string },
  ) {
    return this.tenantService.createTenant(
      createTenantDto.name,
      createTenantDto.companyName,
      createTenantDto.domain,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getTenantProfile(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    const profileData = await this.tenantDataService.getTenantProfile(tenantSchema);
    
    return {
      message: `Accessing tenant-specific data from schema: ${tenantSchema}`,
      schema: tenantSchema,
      data: profileData,
    };
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createTenantUser(
    @Req() req: any,
    @Body() createUserDto: { email: string; password: string },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.tenantDataService.createTenantUser(
      tenantSchema,
      createUserDto.email,
      createUserDto.password,
    );
  }
}
