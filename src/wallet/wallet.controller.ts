// @ts-nocheck
import { Controller, Post, Body, Get, Put, Param, UseGuards, Req, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { VoucherService } from './voucher.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { VoucherStatus } from './voucher.entity';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly voucherService: VoucherService,
  ) {}

  @Post('customers/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async createWallet(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.walletService.createWalletForCustomer(tenantSchema, customerId);
  }

  @Get('customers/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getWallet(@Req() req: any, @Param('customerId') customerId: string) {
    const tenantSchema = req.tenantSchema;
    return this.walletService.getWalletWithTransactions(tenantSchema, customerId);
  }

  @Get('customers/:customerId/balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getWalletBalance(
    @Req() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantSchema = req.tenantSchema;
    const balance = await this.walletService.getWalletBalance(
      tenantSchema,
      customerId,
    );
    return { customer_id: customerId, balance };
  }

  @Get('customers/:customerId/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async getTransactionHistory(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.walletService.getTransactionHistory(
      tenantSchema,
      customerId,
      limit,
      offset,
    );
  }

  @Post('customers/:customerId/credit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async creditWallet(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Body() creditData: {
      amount: number;
      description: string;
      reference_id?: string;
      reference_type?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.walletService.creditWallet(
      tenantSchema,
      customerId,
      creditData.amount,
      creditData.description,
      creditData.reference_id,
      creditData.reference_type,
    );
  }

  @Post('customers/:customerId/debit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF)
  async debitWallet(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Body() debitData: {
      amount: number;
      description: string;
      reference_id?: string;
      reference_type?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.walletService.debitWallet(
      tenantSchema,
      customerId,
      debitData.amount,
      debitData.description,
      debitData.reference_id,
      debitData.reference_type,
    );
  }

  @Post('vouchers/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async generateVoucher(
    @Req() req: any,
    @Body() voucherData: {
      amount: number;
      expires_at: Date;
      code?: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.voucherService.generateVoucher(
      tenantSchema,
      voucherData.amount,
      voucherData.expires_at,
      voucherData.code,
    );
  }

  @Post('vouchers/bulk-generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async bulkGenerateVouchers(
    @Req() req: any,
    @Body() bulkData: {
      count: number;
      amount: number;
      expires_at: Date;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    return this.voucherService.bulkGenerateVouchers(
      tenantSchema,
      bulkData.count,
      bulkData.amount,
      bulkData.expires_at,
    );
  }

  @Post('vouchers/redeem')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async redeemVoucher(
    @Req() req: any,
    @Body() redemptionData: {
      code: string;
    },
  ) {
    const tenantSchema = req.tenantSchema;
    // Get customer ID from JWT token (would be in req.user)
    const customerId = req.user.userId; // Assuming this is set by JwtAuthGuard
    
    return this.voucherService.redeemVoucher(
      tenantSchema,
      customerId,
      redemptionData.code,
    );
  }

  @Get('vouchers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async getAllVouchers(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    return this.voucherService.getAllVouchers(tenantSchema);
  }

  @Get('vouchers/status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async getVouchersByStatus(
    @Req() req: any,
    @Param('status') status: VoucherStatus,
  ) {
    const tenantSchema = req.tenantSchema;
    return this.voucherService.getVouchersByStatus(tenantSchema, status);
  }

  @Post('vouchers/expire')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER)
  async expireVouchers(@Req() req: any) {
    const tenantSchema = req.tenantSchema;
    const count = await this.voucherService.expireVouchers(tenantSchema);
    return {
      message: `Expired ${count} vouchers successfully`,
      expired_count: count,
    };
  }

  @Get('vouchers/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.MANAGER, UserRole.STAFF, UserRole.CUSTOMER)
  async validateVoucher(
    @Req() req: any,
    @Query('code') code: string,
  ) {
    const tenantSchema = req.tenantSchema;
    try {
      const voucher = await this.voucherService.getVoucherByCode(
        tenantSchema,
        code,
      );
      
      const now = new Date();
      const isValid = 
        voucher.status === VoucherStatus.UNUSED && 
        now <= voucher.expires_at;

      return {
        valid: isValid,
        amount: voucher.amount,
        expires_at: voucher.expires_at,
        status: voucher.status,
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message,
      };
    }
  }
}
