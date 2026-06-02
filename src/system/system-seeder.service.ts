import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { TenantSecurityProfile } from '../security/tenant-security-profile.entity';
import { NotificationTemplate } from '../notifications/entities/notification-template.entity';
import { OltDevice } from '../hardware/olt-device.entity';
import { OnuDevice } from '../hardware/onu-device.entity';
import { PopDevice } from '../gis/entities/pop-device.entity';
import { Zone } from '../gis/entities/zone.entity';
import { FiberJointBox } from '../gis/entities/fiber-joint-box.entity';
import { FiberCable } from '../gis/entities/fiber-cable.entity';
import { Customer } from '../crm/customer.entity';
import { CorporateAccount } from '../enterprise/entities/corporate-account.entity';
import { CorporateBranch } from '../enterprise/entities/corporate-branch.entity';
import { Invoice } from '../billing/invoice.entity';
import { InvoiceItem } from '../billing/invoice-item.entity';
import { Wallet } from '../wallet/wallet.entity';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { Ticket } from '../tickets/ticket.entity';
import { CustomerChurnPrediction } from '../ai/entities/customer-churn-prediction.entity';
import { SecurityAuditEvent, SecurityEventType } from '../security/security-audit-event.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SystemSeederService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantSecurityProfile)
    private securityProfileRepository: Repository<TenantSecurityProfile>,
    @InjectRepository(NotificationTemplate)
    private notificationTemplateRepository: Repository<NotificationTemplate>,
    @InjectRepository(OltDevice)
    private oltDeviceRepository: Repository<OltDevice>,
    @InjectRepository(OnuDevice)
    private onuDeviceRepository: Repository<OnuDevice>,
    @InjectRepository(PopDevice)
    private popDeviceRepository: Repository<PopDevice>,
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    @InjectRepository(FiberJointBox)
    private jointBoxRepository: Repository<FiberJointBox>,
    @InjectRepository(FiberCable)
    private fiberCableRepository: Repository<FiberCable>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CorporateAccount)
    private corporateAccountRepository: Repository<CorporateAccount>,
    @InjectRepository(CorporateBranch)
    private corporateBranchRepository: Repository<CorporateBranch>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(CustomerChurnPrediction)
    private churnPredictionRepository: Repository<CustomerChurnPrediction>,
    @InjectRepository(SecurityAuditEvent)
    private auditEventRepository: Repository<SecurityAuditEvent>,
    private dataSource: DataSource
  ) {}

  async seedSandboxTenants(): Promise<{ success: boolean; tenantsCreated: number }> {
    const tenantNames = ['Alpha_Net', 'Apex_Fiber'];
    let createdCount = 0;

    for (const name of tenantNames) {
      try {
        await this.seedTenant(name);
        createdCount++;
      } catch (error) {
        console.error(`Failed to seed tenant ${name}:`, error);
      }
    }

    return { success: true, tenantsCreated: createdCount };
  }

  private async seedTenant(tenantName: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create tenant
      const schemaName = `tenant_${tenantName.toLowerCase().replace(/\s+/g, '_')}`;
      const tenant = queryRunner.manager.create(Tenant, {
        name: tenantName,
        company_name: `${tenantName} ISP Services`,
        schema_name: schemaName,
        domain: `${tenantName.toLowerCase()}.nethost.local`,
        status: 'ACTIVE'
      });
      const savedTenant = await queryRunner.manager.save(tenant);

      // Create schema
      await queryRunner.createSchema(schemaName, true);

      // Seed security profile
      const securityProfile = queryRunner.manager.create(TenantSecurityProfile, {
        tenant_id: savedTenant.id,
        max_requests_per_minute: 100,
        max_concurrent_connections: 20,
        allow_public_signup: false,
        webhook_ip_whitelist: ['127.0.0.1', '192.168.1.0/24'],
        status: 'ACTIVE'
      });
      await queryRunner.manager.save(securityProfile);

      // Seed notification templates
      const templates = [
        { trigger_event: 'WELCOME_USER', subject: 'Welcome to {{company_name}}', body: 'Hello {{user_name}}, welcome to our service!', channels: ['EMAIL', 'SMS'] },
        { trigger_event: 'INVOICE_GENERATED', subject: 'New Invoice Generated', body: 'Your invoice #{{invoice_id}} for {{amount}} is ready.', channels: ['EMAIL'] },
        { trigger_event: 'INVOICE_OVERDUE', subject: 'Invoice Overdue', body: 'Your invoice #{{invoice_id}} is overdue. Please pay immediately.', channels: ['EMAIL', 'SMS'] }
      ];

      for (const template of templates) {
        const notificationTemplate = queryRunner.manager.create(NotificationTemplate, {
          tenant_id: savedTenant.id,
          ...template
        });
        await queryRunner.manager.save(notificationTemplate);
      }

      // Seed network infrastructure
      const olt1 = queryRunner.manager.create(OltDevice, {
        tenant_id: savedTenant.id,
        name: 'OLT-Core-01',
        ip_address: '192.168.100.1',
        device_type: 'GPON',
        pon_ports: 8,
        status: 'ONLINE',
        snmp_community: 'public',
        ssh_username: 'admin',
        ssh_password: 'securepassword'
      });
      const savedOlt1 = await queryRunner.manager.save(olt1);

      const olt2 = queryRunner.manager.create(OltDevice, {
        tenant_id: savedTenant.id,
        name: 'OLT-Core-02',
        ip_address: '192.168.100.2',
        device_type: 'EPON',
        pon_ports: 4,
        status: 'ONLINE',
        snmp_community: 'public',
        ssh_username: 'admin',
        ssh_password: 'securepassword'
      });
      const savedOlt2 = await queryRunner.manager.save(olt2);

      // Seed ONUs
      for (let i = 1; i <= 5; i++) {
        const onu = queryRunner.manager.create(OnuDevice, {
          tenant_id: savedTenant.id,
          olt_device_id: i <= 3 ? savedOlt1.id : savedOlt2.id,
          serial_number: `ONU-${tenantName}-${i.toString().padStart(3, '0')}`,
          mac_address: `00:1A:2B:${i.toString().padStart(2, '0')}:${i.toString().padStart(2, '0')}:${i.toString().padStart(2, '0')}`,
          pon_port: i <= 3 ? 1 : 1,
          rx_power: -23.5,
          tx_power: -18.2,
          status: 'ONLINE',
          last_signal_check: new Date()
        });
        await queryRunner.manager.save(onu);
      }

      // Seed geography
      const pop = queryRunner.manager.create(PopDevice, {
        tenant_id: savedTenant.id,
        name: 'Central POP',
        location_name: 'Downtown Data Center',
        latitude: 23.75,
        longitude: 90.39,
        capacity: 1000,
        status: 'ACTIVE'
      });
      const savedPop = await queryRunner.manager.save(pop);

      const zone = queryRunner.manager.create(Zone, {
        tenant_id: savedTenant.id,
        name: 'Downtown Zone',
        description: 'Central business district coverage',
        pop_device_id: savedPop.id
      });
      const savedZone = await queryRunner.manager.save(zone);

      const jointBox = queryRunner.manager.create(FiberJointBox, {
        tenant_id: savedTenant.id,
        name: 'JB-DT-01',
        location_name: 'Main Street Junction',
        latitude: 23.76,
        longitude: 90.40,
        port_capacity: 24,
        used_ports: 0,
        zone_id: savedZone.id
      });
      const savedJointBox = await queryRunner.manager.save(jointBox);

      // Seed fiber cable
      const fiberCable = queryRunner.manager.create(FiberCable, {
        tenant_id: savedTenant.id,
        name: 'POP-JB-DT-01',
        source_type: 'POP',
        source_id: savedPop.id,
        destination_type: 'JointBox',
        destination_id: savedJointBox.id,
        length_km: 2.5,
        fiber_type: 'SMF-28',
        status: 'ACTIVE'
      });
      await queryRunner.manager.save(fiberCable);

      // Seed customers
      for (let i = 1; i <= 10; i++) {
        const customer = queryRunner.manager.create(Customer, {
          tenant_id: savedTenant.id,
          first_name: `Customer${i}`,
          last_name: `User${i}`,
          email: `customer${i}@${tenantName.toLowerCase()}.com`,
          phone: `+88017123456${i.toString().padStart(2, '0')}`,
          address: `123 Street ${i}, City, Country`,
          connection_status: 'ACTIVE',
          service_plan: '100Mbps',
          monthly_fee: 1500,
          radius_username: `user${i}@${tenantName.toLowerCase()}`,
          radius_password: 'securepassword',
          onu_device_id: i <= 5 ? (await this.onuDeviceRepository.findOne({ where: { tenant_id: savedTenant.id } })).id : null
        });
        const savedCustomer = await queryRunner.manager.save(customer);

        // Create wallet
        const wallet = queryRunner.manager.create(Wallet, {
          tenant_id: savedTenant.id,
          customer_id: savedCustomer.id,
          balance: 1000 + (i * 100),
          status: 'ACTIVE'
        });
        await queryRunner.manager.save(wallet);

        // Create invoice
        const invoice = queryRunner.manager.create(Invoice, {
          tenant_id: savedTenant.id,
          customer_id: savedCustomer.id,
          invoice_number: `INV-${tenantName}-${i.toString().padStart(4, '0')}`,
          issue_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: i % 3 === 0 ? 'PAID' : 'UNPAID',
          subtotal: 1500,
          tax: 150,
          total: 1650,
          payment_method: i % 3 === 0 ? 'WALLET' : null
        });
        const savedInvoice = await queryRunner.manager.save(invoice);

        // Create invoice item
        const invoiceItem = queryRunner.manager.create(InvoiceItem, {
          tenant_id: savedTenant.id,
          invoice_id: savedInvoice.id,
          description: 'Monthly Internet Service',
          quantity: 1,
          unit_price: 1500,
          total_price: 1500
        });
        await queryRunner.manager.save(invoiceItem);

        // Create wallet transaction for paid invoices
        if (i % 3 === 0) {
          const transaction = queryRunner.manager.create(WalletTransaction, {
            tenant_id: savedTenant.id,
            wallet_id: wallet.id,
            transaction_type: 'DEBIT',
            amount: 1650,
            description: `Payment for invoice ${savedInvoice.invoice_number}`,
            reference_id: savedInvoice.id,
            reference_type: 'INVOICE'
          });
          await queryRunner.manager.save(transaction);
        }

        // Create ticket for some customers
        if (i % 4 === 0) {
          const ticket = queryRunner.manager.create(Ticket, {
            tenant_id: savedTenant.id,
            customer_id: savedCustomer.id,
            title: 'Slow Internet Speed',
            description: 'My internet has been slow for the past 2 days',
            status: 'OPEN',
            priority: 'MEDIUM',
            category: 'TECHNICAL',
            assigned_to: null,
            due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          });
          await queryRunner.manager.save(ticket);
        }

        // Create churn prediction for some customers
        if (i % 5 === 0) {
          const churnPrediction = queryRunner.manager.create(CustomerChurnPrediction, {
            tenant_id: savedTenant.id,
            customer_id: savedCustomer.id,
            churn_risk_score: 75,
            risk_level: 'HIGH',
            last_updated: new Date(),
            notes: 'Multiple overdue payments detected'
          });
          await queryRunner.manager.save(churnPrediction);
        }
      }

      // Seed corporate accounts
      for (let i = 1; i <= 2; i++) {
        const corporateAccount = queryRunner.manager.create(CorporateAccount, {
          tenant_id: savedTenant.id,
          company_name: `${tenantName} Corp ${i}`,
          registration_number: `CORP-${i.toString().padStart(4, '0')}`,
          tax_id: `TAX-${i.toString().padStart(6, '0')}`,
          billing_email: `billing@corp${i}.${tenantName.toLowerCase()}.com`,
          contact_person: `Manager ${i}`,
          contact_phone: `+88018123456${i.toString().padStart(2, '0')}`,
          address: `Corporate Tower ${i}, Business District`,
          sla_profile: 'CORPORATE_PREMIUM',
          status: 'ACTIVE'
        });
        const savedCorporate = await queryRunner.manager.save(corporateAccount);

        // Create branches
        for (let j = 1; j <= 3; j++) {
          const branch = queryRunner.manager.create(CorporateBranch, {
            tenant_id: savedTenant.id,
            corporate_account_id: savedCorporate.id,
            name: `Branch ${j}`,
            address: `Branch ${j} Location, City`,
            contact_person: `Branch Manager ${j}`,
            contact_phone: `+88019123456${j.toString().padStart(2, '0')}`,
            olt_device_id: savedOlt1.id,
            dedicated_line: true,
            ip_pool: `10.${i}.${j}.0/24`,
            status: 'ACTIVE'
          });
          await queryRunner.manager.save(branch);
        }
      }

      // Seed security audit events
      const auditEvents = [
        { event_type: SecurityEventType.RATE_LIMIT_EXCEEDED, ip_address: '192.168.1.100', request_path: '/api/customers', payload_summary: JSON.stringify({ method: 'GET', status: 429 }) },
        { event_type: SecurityEventType.UNAUTHORIZED_IP, ip_address: '203.0.113.45', request_path: '/webhooks/payment', payload_summary: JSON.stringify({ method: 'POST', status: 403 }) }
      ];

      for (const event of auditEvents) {
        const auditEvent = queryRunner.manager.create(SecurityAuditEvent, {
          tenant_id: savedTenant.id,
          ...event
        });
        await queryRunner.manager.save(auditEvent);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
