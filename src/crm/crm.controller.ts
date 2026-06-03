// @ts-nocheck
import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req, Query } from '@nestjs/common';
import { LeadService } from './lead.service';
import { QuotationService } from './quotation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { LeadStatus } from './lead.entity';
import { QuotationStatus } from './quotation.entity';

@Controller('crm')
export class CrmController {
  constructor(
    private readonly leadService: LeadService,
    private readonly quotationService: QuotationService,
  ) {}

  // Lead Management Endpoints
  @Post('leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async createLead(@Req() req: any, @Body() leadData: any) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.createLead(tenantSchema, leadData);
  }

  @Get('leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllLeads(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.getAllLeads(tenantSchema);
  }

  @Get('leads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getLeadById(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.getLeadById(tenantSchema, id);
  }

  @Put('leads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateLead(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.updateLead(tenantSchema, id, updateData);
  }

  @Delete('leads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async deleteLead(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.deleteLead(tenantSchema, id);
  }

  @Put('leads/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateLeadStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: { status: LeadStatus },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.updateLeadStatus(tenantSchema, id, statusData.status);
  }

  @Get('leads/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async searchLeads(@Req() req: any, @Query('q') searchTerm: string) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.searchLeads(tenantSchema, searchTerm);
  }

  @Get('leads/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getLeadsByStatus(@Req() req: any, @Param('status') status: LeadStatus) {
    const tenantSchema = req.tenantSchema;
    return this.leadService.getLeadsByStatus(tenantSchema, status);
  }

  // Quotation Management Endpoints
  @Post('quotations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async createQuotation(@Req() req: any, @Body() quotationData: any) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.createQuotation(tenantSchema, quotationData);
  }

  @Get('quotations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getAllQuotations(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.getAllQuotations(tenantSchema);
  }

  @Get('quotations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getQuotationById(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.getQuotationById(tenantSchema, id);
  }

  @Get('leads/:leadId/quotations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getQuotationsByLeadId(@Req() req: any, @Param('leadId') leadId: string) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.getQuotationsByLeadId(tenantSchema, leadId);
  }

  @Put('quotations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateQuotation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.updateQuotation(tenantSchema, id, updateData);
  }

  @Put('quotations/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async updateQuotationStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() statusData: { status: QuotationStatus },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.updateQuotationStatus(tenantSchema, id, statusData.status);
  }

  @Delete('quotations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async deleteQuotation(@Req() req: any, @Param('id') id: string) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.deleteQuotation(tenantSchema, id);
  }

  @Get('quotations/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async getQuotationsByStatus(
    @Req() req: any,
    @Param('status') status: QuotationStatus,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.quotationService.getQuotationsByStatus(tenantSchema, status);
  }

  @Post('quotations/check-expiry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async checkQuotationExpiry(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    await this.quotationService.checkQuotationExpiry(tenantSchema);
    return { message: 'Quotation expiry check completed' };
  }
}
