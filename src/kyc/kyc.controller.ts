// @ts-nocheck
import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req, Query } from '@nestjs/common';
import { KYCService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { KYCStatus, IdentityType } from './kyc.entity';

@Controller('kyc')
export class KYCController {
  constructor(private readonly kycService: KYCService) {}

  @Post('profiles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async createKYCProfile(
    @Req() req: any,
    @Body() kycData: {
      user_id: string;
      identity_type: IdentityType;
      identity_number: string;
      identity_front_path?: string;
      identity_back_path?: string;
      selfie_path?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.createKYCProfile(tenantSchema, kycData.user_id, kycData);
  }

  @Get('profiles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllKYCProfiles(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.getAllKYCProfiles(tenantSchema);
  }

  @Get('profiles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getKYCProfileById(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.getKYCProfileById(tenantSchema, id);
  }

  @Get('users/:userId/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getKYCProfileByUserId(@Req() req: any, @Param('userId') userId: string) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.getKYCProfileByUserId(tenantSchema, userId);
  }

  @Put('profiles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateKYCProfile(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.updateKYCProfile(tenantSchema, id, updateData);
  }

  @Put('profiles/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async updateKYCStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: {
      status: KYCStatus;
      verified_by?: string;
      rejection_reason?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.updateKYCStatus(
      tenantSchema,
      id,
      statusData.status,
      statusData.verified_by,
      statusData.rejection_reason,
    );
  }

  @Delete('profiles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async deleteKYCProfile(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.deleteKYCProfile(tenantSchema, id);
  }

  @Get('profiles/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getKYCProfilesByStatus(
    @Req() req: any,
    @Param('status') status: KYCStatus,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.kycService.getKYCProfilesByStatus(tenantSchema, status);
  }

  @Get('users/:userId/activation-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async canUserBeActivated(@Req() req: any, @Param('userId') userId: string) {
    const tenantSchema = req.tenantSchema;
    const canActivate = await this.kycService.canUserBeActivated(
      tenantSchema,
      userId,
    );
    return {
      user_id: userId,
      can_be_activated: canActivate,
      message: canActivate
        ? 'User can be activated on RADIUS (KYC approved)'
        : 'User cannot be activated (KYC not approved or missing)',
    };
  }
}
