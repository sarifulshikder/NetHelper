// @ts-nocheck
import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SupplierStatus } from './entities/supplier.entity';
import { InventoryItemType } from './entities/inventory-item.entity';
import { AssetStatus } from './entities/asset-instance.entity';
import { StockTransactionType } from './entities/stock-transaction.entity';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('suppliers')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createSupplier(
    @Body() body: {
      name: string;
      contact_person?: string;
      phone?: string;
      email?: string;
      address?: string;
      status?: SupplierStatus;
    },
  ) {
    return this.inventoryService.createSupplier(body);
  }

  @Post('items')
  @Roles('Super Admin', 'ISP Admin', 'Manager')
  async createInventoryItem(
    @Body() body: {
      name: string;
      model?: string;
      type: InventoryItemType;
      description?: string;
      total_stock?: number;
      available_stock?: number;
      low_stock_threshold?: number;
      supplier_id?: string;
    },
  ) {
    return this.inventoryService.createInventoryItem(body);
  }

  @Post('items/:id/add-stock')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async addStockToItem(
    @Param('id') itemId: string,
    @Body() body: {
      quantity: number;
      reference_note: string;
    },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.inventoryService.addStockToItem(
      itemId,
      body.quantity,
      body.reference_note,
      userId,
    );
  }

  @Post('assets/register-serials')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async registerAssetSerials(
    @Body() body: {
      item_id: string;
      serial_numbers: string[];
    },
  ) {
    return this.inventoryService.registerAssetSerials(
      body.item_id,
      body.serial_numbers,
    );
  }

  @Get('items/low-stock')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getLowStockItems() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('suppliers')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllSuppliers() {
    return this.inventoryService.getAllSuppliers();
  }

  @Get('items')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllInventoryItems() {
    return this.inventoryService.getAllInventoryItems();
  }

  @Get('assets')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllAssetInstances() {
    return this.inventoryService.getAllAssetInstances();
  }

  @Get('transactions')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAllStockTransactions() {
    return this.inventoryService.getStockTransactions();
  }

  @Get('transactions/item/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getStockTransactionsByItem(@Param('id') itemId: string) {
    return this.inventoryService.getStockTransactions(itemId);
  }

  @Get('suppliers/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getSupplierById(@Param('id') id: string) {
    return this.inventoryService.getSupplierById(id);
  }

  @Get('items/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getInventoryItemById(@Param('id') id: string) {
    return this.inventoryService.getInventoryItemById(id);
  }

  @Get('assets/:id')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAssetInstanceById(@Param('id') id: string) {
    return this.inventoryService.getAssetInstanceById(id);
  }

  @Get('assets/customer/:customerId')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAssetInstancesByCustomer(@Param('customerId') customerId: string) {
    return this.inventoryService.getAssetInstancesByCustomer(customerId);
  }

  @Get('assets/status/:status')
  @Roles('Super Admin', 'ISP Admin', 'Manager', 'Staff')
  async getAssetInstancesByStatus(@Param('status') status: AssetStatus) {
    return this.inventoryService.getAssetInstancesByStatus(status);
  }
}
