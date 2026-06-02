import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Supplier, SupplierStatus } from './entities/supplier.entity';
import { InventoryItem, InventoryItemType } from './entities/inventory-item.entity';
import { AssetInstance, AssetStatus } from './entities/asset-instance.entity';
import { StockTransaction, StockTransactionType } from './entities/stock-transaction.entity';
import { Customer } from '../crm/customer.entity';
import { User } from '../users/user.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(AssetInstance)
    private assetInstanceRepository: Repository<AssetInstance>,
    @InjectRepository(StockTransaction)
    private stockTransactionRepository: Repository<StockTransaction>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  // Create a new supplier
  async createSupplier(data: {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    status?: SupplierStatus;
  }): Promise<Supplier> {
    const supplier = this.supplierRepository.create(data);
    return await this.supplierRepository.save(supplier);
  }

  // Create a new inventory item
  async createInventoryItem(data: {
    name: string;
    model?: string;
    type: InventoryItemType;
    description?: string;
    total_stock?: number;
    available_stock?: number;
    low_stock_threshold?: number;
    supplier_id?: string;
  }): Promise<InventoryItem> {
    if (data.supplier_id) {
      const supplier = await this.supplierRepository.findOne({ where: { id: data.supplier_id } });
      if (!supplier) {
        throw new NotFoundException('Supplier not found');
      }
    }

    const item = this.inventoryItemRepository.create(data);
    return await this.inventoryItemRepository.save(item);
  }

  // Add stock to an inventory item (with transaction logging)
  async addStockToItem(
    itemId: string,
    quantity: number,
    referenceNote: string,
    createdByUserId: string,
  ): Promise<{ item: InventoryItem; transaction: StockTransaction }> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      const item = await transactionalEntityManager.findOne(InventoryItem, {
        where: { id: itemId },
      });

      if (!item) {
        throw new NotFoundException('Inventory item not found');
      }

      if (quantity <= 0) {
        throw new BadRequestException('Quantity must be positive');
      }

      // Update stock levels
      item.total_stock += quantity;
      item.available_stock += quantity;

      await transactionalEntityManager.save(InventoryItem, item);

      // Create transaction log
      const transaction = transactionalEntityManager.create(StockTransaction, {
        inventory_item_id: itemId,
        quantity: quantity,
        type: StockTransactionType.STOCK_IN,
        reference_note: referenceNote,
        created_by_user_id: createdByUserId,
      });

      await transactionalEntityManager.save(StockTransaction, transaction);

      return { item, transaction };
    });
  }

  // Register serial numbers for asset instances
  async registerAssetSerials(
    itemId: string,
    serialNumbers: string[],
  ): Promise<AssetInstance[]> {
    const item = await this.inventoryItemRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (serialNumbers.length === 0) {
      throw new BadRequestException('No serial numbers provided');
    }

    // Check if we have enough available stock
    if (item.available_stock < serialNumbers.length) {
      throw new BadRequestException(
        `Not enough available stock. Available: ${item.available_stock}, Requested: ${serialNumbers.length}`,
      );
    }

    // Check for duplicate serial numbers
    const existingAssets = await this.assetInstanceRepository.find({
      where: { serial_number_or_mac: In(serialNumbers) },
    });

    if (existingAssets.length > 0) {
      const existingSerials = existingAssets.map((asset) => asset.serial_number_or_mac);
      throw new BadRequestException(
        `Serial numbers already exist: ${existingSerials.join(', ')}`,
      );
    }

    // Create asset instances
    const assets = serialNumbers.map((serialNumber) => {
      return this.assetInstanceRepository.create({
        inventory_item_id: itemId,
        serial_number_or_mac: serialNumber,
        status: AssetStatus.IN_WAREHOUSE,
      });
    });

    const savedAssets = await this.assetInstanceRepository.save(assets);

    // Update available stock (these are now tracked as individual assets)
    item.available_stock -= serialNumbers.length;
    await this.inventoryItemRepository.save(item);

    return savedAssets;
  }

  // Assign asset to customer
  async assignAssetToCustomer(
    assetInstanceId: string,
    customerId: string,
    assignedByUserId?: string,
  ): Promise<AssetInstance> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      const asset = await transactionalEntityManager.findOne(AssetInstance, {
        where: { id: assetInstanceId },
        relations: ['inventoryItem'],
      });

      if (!asset) {
        throw new NotFoundException('Asset instance not found');
      }

      const customer = await transactionalEntityManager.findOne(Customer, {
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      if (asset.status !== AssetStatus.IN_WAREHOUSE && asset.status !== AssetStatus.RETURNED) {
        throw new BadRequestException(
          `Asset cannot be assigned. Current status: ${asset.status}`,
        );
      }

      // Update asset status and assignment
      asset.status = AssetStatus.ASSIGNED_TO_CUSTOMER;
      asset.assigned_to_customer_id = customerId;

      if (assignedByUserId) {
        const user = await transactionalEntityManager.findOne(User, {
          where: { id: assignedByUserId },
        });
        if (user) {
          asset.assigned_to_staff_id = assignedByUserId;
        }
      }

      const updatedAsset = await transactionalEntityManager.save(AssetInstance, asset);

      // Create stock transaction for the assignment
      const transaction = transactionalEntityManager.create(StockTransaction, {
        inventory_item_id: asset.inventory_item_id,
        quantity: 1,
        type: StockTransactionType.STOCK_OUT,
        reference_note: `Asset assigned to customer ${customer.name || customerId}`,
        created_by_user_id: assignedByUserId,
      });

      await transactionalEntityManager.save(StockTransaction, transaction);

      return updatedAsset;
    });
  }

  // Get all suppliers
  async getAllSuppliers(): Promise<Supplier[]> {
    return await this.supplierRepository.find();
  }

  // Get all inventory items
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await this.inventoryItemRepository.find({
      relations: ['supplier'],
    });
  }

  // Get all asset instances
  async getAllAssetInstances(): Promise<AssetInstance[]> {
    return await this.assetInstanceRepository.find({
      relations: ['inventoryItem', 'assignedToCustomer', 'assignedToStaff'],
    });
  }

  // Get low stock items
  async getLowStockItems(): Promise<InventoryItem[]> {
    return await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.available_stock < item.low_stock_threshold')
      .leftJoinAndSelect('item.supplier', 'supplier')
      .getMany();
  }

  // Get stock transactions
  async getStockTransactions(itemId?: string): Promise<StockTransaction[]> {
    const query = this.stockTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.inventoryItem', 'item')
      .leftJoinAndSelect('transaction.createdBy', 'user')
      .orderBy('transaction.created_at', 'DESC');

    if (itemId) {
      query.andWhere('transaction.inventory_item_id = :itemId', { itemId });
    }

    return await query.getMany();
  }

  // Get supplier by ID
  async getSupplierById(id: string): Promise<Supplier | null> {
    return await this.supplierRepository.findOne({ where: { id } });
  }

  // Get inventory item by ID
  async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    return await this.inventoryItemRepository.findOne({
      where: { id },
      relations: ['supplier'],
    });
  }

  // Get asset instance by ID
  async getAssetInstanceById(id: string): Promise<AssetInstance | null> {
    return await this.assetInstanceRepository.findOne({
      where: { id },
      relations: ['inventoryItem', 'assignedToCustomer', 'assignedToStaff'],
    });
  }

  // Get asset instances by customer
  async getAssetInstancesByCustomer(customerId: string): Promise<AssetInstance[]> {
    return await this.assetInstanceRepository.find({
      where: { assigned_to_customer_id: customerId },
      relations: ['inventoryItem', 'assignedToCustomer', 'assignedToStaff'],
    });
  }

  // Get asset instances by status
  async getAssetInstancesByStatus(status: AssetStatus): Promise<AssetInstance[]> {
    return await this.assetInstanceRepository.find({
      where: { status },
      relations: ['inventoryItem', 'assignedToCustomer', 'assignedToStaff'],
    });
  }
}
