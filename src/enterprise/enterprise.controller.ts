import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CorporateAccountStatus } from './entities/corporate-account.entity';
import { CorporateBranchStatus } from './entities/corporate-branch.entity';
import { CorporateSlaPriority } from './entities/corporate-sla-profile.entity';
import { InvoiceStatus } from '../billing/invoice.entity';

@Controller('enterprise')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post('accounts')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createCorporateAccount(
    @Body() body: {
      company_name: string;
      trade_license_number: string;
      bin_number: string;
      billing_contact_person: string;
      phone: string;
      email: string;
      billing_address?: string;
      assigned_account_manager_id?: string;
      consolidated_billing?: boolean;
      billing_cycle_day?: number;
    },
  ) {
    return this.enterpriseService.createCorporateAccount(body);
  }

  @Post('accounts/:id/branches')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createCorporateBranch(
    @Param('id') corporateAccountId: string,
    @Body() body: {
      branch_name: string;
      installation_address: string;
      location_lat?: number;
      location_long?: number;
      olt_device_id?: string;
      package_or_custom_profile?: string;
      monthly_price: number;
      is_dedicated_line?: boolean;
      dedicated_bandwidth?: string;
      burst_speed?: string;
      assigned_ip_pool?: string;
    },
  ) {
    return this.enterpriseService.createCorporateBranch({
      corporate_account_id: corporateAccountId,
      ...body,
    });
  }

  @Get('accounts')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllCorporateAccounts() {
    return this.enterpriseService.getAllCorporateAccounts();
  }

  @Get('accounts/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getCorporateAccountById(@Param('id') id: string) {
    return this.enterpriseService.getCorporateAccountById(id);
  }

  @Get('accounts/:id/branches')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getBranchesForAccount(
    @Param('id') corporateAccountId: string,
    @Query('status') status?: CorporateBranchStatus,
  ) {
    return this.enterpriseService.getBranchesForAccount(corporateAccountId, status);
  }

  @Post('billing/consolidated-run')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async generateConsolidatedCorporateInvoice(
    @Body() body: { corporate_account_id: string },
  ) {
    return this.enterpriseService.generateConsolidatedCorporateInvoice(
      body.corporate_account_id,
    );
  }

  @Post('sla-profiles')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createOrUpdateSlaProfile(
    @Body() body: {
      corporate_account_id?: string;
      corporate_branch_id?: string;
      priority_level: CorporateSlaPriority;
      mttr_hours: number;
      response_time_minutes: number;
      dedicated_support_agent?: boolean;
      proactive_monitoring?: boolean;
      custom_terms?: string;
    },
  ) {
    return this.enterpriseService.createOrUpdateSlaProfile(body);
  }

  @Get('sla-profiles')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllSlaProfiles() {
    return this.enterpriseService.getAllSlaProfiles();
  }

  @Get('sla-profiles/account/:accountId')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getSlaProfileForAccount(@Param('accountId') accountId: string) {
    return this.enterpriseService.getSlaProfile(accountId);
  }

  @Get('sla-profiles/branch/:branchId')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getSlaProfileForBranch(@Param('branchId') branchId: string) {
    return this.enterpriseService.getSlaProfile(undefined, branchId);
  }

  @Get('branches/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getBranchById(@Param('id') id: string) {
    return this.enterpriseService.getBranchById(id);
  }

  @Post('branches/:id/status')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async updateBranchStatus(
    @Param('id') branchId: string,
    @Body() body: { status: CorporateBranchStatus },
  ) {
    return this.enterpriseService.updateBranchStatus(branchId, body.status);
  }

  @Post('accounts/:id/status')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async updateAccountStatus(
    @Param('id') accountId: string,
    @Body() body: { status: CorporateAccountStatus },
  ) {
    return this.enterpriseService.updateAccountStatus(accountId, body.status);
  }

  @Get('accounts/:id/invoices')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getCorporateInvoices(
    @Param('id') corporateAccountId: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.enterpriseService.getCorporateInvoices(corporateAccountId, status);
  }

  @Get('invoices/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getCorporateInvoiceById(@Param('id') invoiceId: string) {
    return this.enterpriseService.getCorporateInvoiceById(invoiceId);
  }

  @Get('accounts/:id/branches/status')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getBranchesWithStatus(@Param('id') corporateAccountId: string) {
    return this.enterpriseService.getBranchesWithStatus(corporateAccountId);
  }
}
