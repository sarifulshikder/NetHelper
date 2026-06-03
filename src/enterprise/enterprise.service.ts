// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CorporateAccount, CorporateAccountStatus } from './entities/corporate-account.entity';
import { CorporateBranch, CorporateBranchStatus } from './entities/corporate-branch.entity';
import { CorporateSlaProfile, CorporateSlaPriority } from './entities/corporate-sla-profile.entity';
import { User } from '../users/user.entity';
import { Invoice, InvoiceStatus } from '../billing/invoice.entity';
import { InvoiceItem } from '../billing/invoice-item.entity';
import { BillingService } from '../billing/billing.service';
import { TicketsService } from '../tickets/tickets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OltDevice } from '../hardware/olt-device.entity';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(CorporateAccount)
    private corporateAccountRepository: Repository<CorporateAccount>,
    @InjectRepository(CorporateBranch)
    private corporateBranchRepository: Repository<CorporateBranch>,
    @InjectRepository(CorporateSlaProfile)
    private corporateSlaProfileRepository: Repository<CorporateSlaProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(OltDevice)
    private oltDeviceRepository: Repository<OltDevice>,
    private billingService: BillingService,
    private ticketsService: TicketsService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  // Create a corporate account
  async createCorporateAccount(data: {
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
  }): Promise<CorporateAccount> {
    // Check if trade license or BIN already exists
    const existingByLicense = await this.corporateAccountRepository.findOne({
      where: { trade_license_number: data.trade_license_number },
    });

    if (existingByLicense) {
      throw new BadRequestException('Trade license number already registered');
    }

    const existingByBin = await this.corporateAccountRepository.findOne({
      where: { bin_number: data.bin_number },
    });

    if (existingByBin) {
      throw new BadRequestException('BIN number already registered');
    }

    // Validate account manager
    if (data.assigned_account_manager_id) {
      const accountManager = await this.userRepository.findOne({
        where: { id: data.assigned_account_manager_id },
      });
      if (!accountManager) {
        throw new NotFoundException('Account manager not found');
      }
    }

    const account = this.corporateAccountRepository.create(data);
    return await this.corporateAccountRepository.save(account);
  }

  // Create a corporate branch
  async createCorporateBranch(data: {
    corporate_account_id: string;
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
  }): Promise<CorporateBranch> {
    const account = await this.corporateAccountRepository.findOne({
      where: { id: data.corporate_account_id },
    });

    if (!account) {
      throw new NotFoundException('Corporate account not found');
    }

    // Validate OLT device
    if (data.olt_device_id) {
      const oltDevice = await this.oltDeviceRepository.findOne({
        where: { id: data.olt_device_id },
      });
      if (!oltDevice) {
        throw new NotFoundException('OLT device not found');
      }
    }

    const branch = this.corporateBranchRepository.create(data);
    return await this.corporateBranchRepository.save(branch);
  }

  // Get all corporate accounts
  async getAllCorporateAccounts(): Promise<CorporateAccount[]> {
    return await this.corporateAccountRepository.find({
      relations: ['accountManager', 'branches'],
      order: { created_at: 'DESC' },
    });
  }

  // Get corporate account by ID
  async getCorporateAccountById(id: string): Promise<CorporateAccount | null> {
    return await this.corporateAccountRepository.findOne({
      where: { id },
      relations: ['accountManager', 'branches'],
    });
  }

  // Get all branches for a corporate account
  async getBranchesForAccount(
    corporateAccountId: string,
    includeStatus?: CorporateBranchStatus,
  ): Promise<CorporateBranch[]> {
    const query = this.corporateBranchRepository
      .createQueryBuilder('branch')
      .where('branch.corporate_account_id = :corporateAccountId', { corporateAccountId })
      .leftJoinAndSelect('branch.oltDevice', 'oltDevice')
      .orderBy('branch.created_at', 'DESC');

    if (includeStatus) {
      query.andWhere('branch.status = :status', { status: includeStatus });
    }

    return await query.getMany();
  }

  // Generate consolidated corporate invoice
  async generateConsolidatedCorporateInvoice(
    corporateAccountId: string,
  ): Promise<Invoice> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      const account = await transactionalEntityManager.findOne(CorporateAccount, {
        where: { id: corporateAccountId },
        relations: ['branches'],
      });

      if (!account) {
        throw new NotFoundException('Corporate account not found');
      }

      if (!account.consolidated_billing) {
        throw new BadRequestException(
          'Consolidated billing is not enabled for this account',
        );
      }

      // Get all active branches
      const activeBranches = account.branches.filter(
        (branch) => branch.status === CorporateBranchStatus.ACTIVE,
      );

      if (activeBranches.length === 0) {
        throw new BadRequestException('No active branches found for billing');
      }

      // Calculate total amount
      const totalAmount = activeBranches.reduce(
        (sum, branch) => sum + branch.monthly_price,
        0,
      );

      // Generate invoice number
      const invoiceNumber = `CORP-${account.id.substring(0, 8).toUpperCase()}-${Date.now()}`;

      // Create invoice
      const invoice = transactionalEntityManager.create(Invoice, {
        customer_id: corporateAccountId, // Using corporate account ID as customer
        invoice_number: invoiceNumber,
        invoice_date: new Date(),
        due_date: this.calculateDueDate(account.billing_cycle_day),
        total_amount: totalAmount,
        status: InvoiceStatus.UNPAID,
        is_corporate: true,
        corporate_account_id: corporateAccountId,
      });

      const savedInvoice = await transactionalEntityManager.save(Invoice, invoice);

      // Create invoice items for each branch
      const invoiceItems = activeBranches.map((branch) => {
        return transactionalEntityManager.create(InvoiceItem, {
          invoice_id: savedInvoice.id,
          description: `${branch.branch_name} - ${branch.package_or_custom_profile || 'Dedicated Line'}`,
          amount: branch.monthly_price,
        });
      });

      await transactionalEntityManager.save(InvoiceItem, invoiceItems);

      // Send invoice generated notification
      await this.notificationsService.sendInvoiceGeneratedNotification(
        corporateAccountId,
        invoiceNumber,
        totalAmount,
        savedInvoice.due_date.toISOString().split('T')[0],
      );

      return savedInvoice;
    });
  }

  // Create or update SLA profile
  async createOrUpdateSlaProfile(data: {
    corporate_account_id?: string;
    corporate_branch_id?: string;
    priority_level: CorporateSlaPriority;
    mttr_hours: number;
    response_time_minutes: number;
    dedicated_support_agent?: boolean;
    proactive_monitoring?: boolean;
    custom_terms?: string;
  }): Promise<CorporateSlaProfile> {
    // Validate that either account or branch is provided
    if (!data.corporate_account_id && !data.corporate_branch_id) {
      throw new BadRequestException(
        'Either corporate_account_id or corporate_branch_id must be provided',
      );

      if (data.corporate_branch_id) {
        const branch = await this.corporateBranchRepository.findOne({
          where: { id: data.corporate_branch_id },
        });
        if (!branch) {
          throw new NotFoundException('Corporate branch not found');
        }
        data.corporate_account_id = branch.corporate_account_id;
      }
    }

    // Check for existing profile
    let profile = await this.corporateSlaProfileRepository.findOne({
      where: [
        { corporate_account_id: data.corporate_account_id },
        { corporate_branch_id: data.corporate_branch_id },
      ],
    });

    if (profile) {
      // Update existing profile
      profile.priority_level = data.priority_level;
      profile.mttr_hours = data.mttr_hours;
      profile.response_time_minutes = data.response_time_minutes;
      profile.dedicated_support_agent = data.dedicated_support_agent || false;
      profile.proactive_monitoring = data.proactive_monitoring || false;
      profile.custom_terms = data.custom_terms;
    } else {
      // Create new profile
      profile = this.corporateSlaProfileRepository.create(data);
    }

    return await this.corporateSlaProfileRepository.save(profile);
  }

  // Get SLA profile for account or branch
  async getSlaProfile(
    corporateAccountId?: string,
    corporateBranchId?: string,
  ): Promise<CorporateSlaProfile | null> {
    if (!corporateAccountId && !corporateBranchId) {
      throw new BadRequestException(
        'Either corporateAccountId or corporateBranchId must be provided',
      );
    }

    const query = this.corporateSlaProfileRepository
      .createQueryBuilder('profile')
      .orderBy('profile.created_at', 'DESC');

    if (corporateAccountId) {
      query.andWhere('profile.corporate_account_id = :corporateAccountId', {
        corporateAccountId,
      });
    }

    if (corporateBranchId) {
      query.andWhere('profile.corporate_branch_id = :corporateBranchId', {
        corporateBranchId,
      });
    }

    return await query.getOne();
  }

  // Get branch by ID
  async getBranchById(id: string): Promise<CorporateBranch | null> {
    return await this.corporateBranchRepository.findOne({
      where: { id },
      relations: ['corporateAccount', 'oltDevice'],
    });
  }

  // Update branch status
  async updateBranchStatus(
    branchId: string,
    status: CorporateBranchStatus,
  ): Promise<CorporateBranch> {
    const branch = await this.corporateBranchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    branch.status = status;
    return await this.corporateBranchRepository.save(branch);
  }

  // Update account status
  async updateAccountStatus(
    accountId: string,
    status: CorporateAccountStatus,
  ): Promise<CorporateAccount> {
    const account = await this.corporateAccountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Corporate account not found');
    }

    account.status = status;
    return await this.corporateAccountRepository.save(account);
  }

  // Calculate due date based on billing cycle day
  private calculateDueDate(billingCycleDay: number): Date {
    const now = new Date();
    const currentDay = now.getDate();
    const targetDay = billingCycleDay || 30;

    let dueDate = new Date(now);

    if (currentDay <= targetDay) {
      // Same month
      dueDate.setDate(targetDay);
    } else {
      // Next month
      dueDate.setMonth(now.getMonth() + 1);
      dueDate.setDate(Math.min(targetDay, 31)); // Handle months with fewer days
    }

    // If the calculated date is in the past (e.g., Feb 30), move to next month
    if (dueDate < now) {
      dueDate.setMonth(now.getMonth() + 1);
      dueDate.setDate(Math.min(targetDay, 31));
    }

    return dueDate;
  }

  // Get all corporate invoices
  async getCorporateInvoices(
    corporateAccountId: string,
    status?: InvoiceStatus,
  ): Promise<Invoice[]> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.corporate_account_id = :corporateAccountId', {
        corporateAccountId,
      })
      .leftJoinAndSelect('invoice.items', 'items')
      .orderBy('invoice.due_date', 'DESC');

    if (status) {
      query.andWhere('invoice.status = :status', { status });
    }

    return await query.getMany();
  }

  // Get corporate invoice by ID
  async getCorporateInvoiceById(invoiceId: string): Promise<Invoice | null> {
    return await this.invoiceRepository.findOne({
      where: { id: invoiceId, is_corporate: true },
      relations: ['items'],
    });
  }

  // Get all SLA profiles
  async getAllSlaProfiles(): Promise<CorporateSlaProfile[]> {
    return await this.corporateSlaProfileRepository.find({
      relations: ['corporateAccount', 'corporateBranch'],
      order: { priority_level: 'DESC' },
    });
  }

  // Get branches with online/offline status
  async getBranchesWithStatus(corporateAccountId: string): Promise<any[]> {
    const branches = await this.getBranchesForAccount(corporateAccountId);

    return branches.map((branch) => ({
      id: branch.id,
      branch_name: branch.branch_name,
      installation_address: branch.installation_address,
      status: branch.status,
      monthly_price: branch.monthly_price,
      is_dedicated_line: branch.is_dedicated_line,
      dedicated_bandwidth: branch.dedicated_bandwidth,
      burst_speed: branch.burst_speed,
      assigned_ip_pool: branch.assigned_ip_pool,
      online_status: branch.status === CorporateBranchStatus.ACTIVE ? 'ONLINE' : 'OFFLINE',
      olt_device: branch.oltDevice
        ? {
            id: branch.oltDevice.id,
            name: branch.oltDevice.name,
            status: branch.oltDevice.status,
          }
        : null,
    }));
  }
}
