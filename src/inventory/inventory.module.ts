import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { AssetInstance } from './entities/asset-instance.entity';
import { StockTransaction } from './entities/stock-transaction.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, InventoryItem, AssetInstance, StockTransaction]),
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
