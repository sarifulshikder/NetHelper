import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async createTenant(
    name: string,
    companyName: string,
    domain: string,
  ): Promise<Tenant> {
    const schemaName = `tenant_${name.toLowerCase().replace(/\s+/g, '_')}`;

    // Create the tenant record in public schema
    const tenant = new Tenant();
    tenant.name = name;
    tenant.company_name = companyName;
    tenant.schema_name = schemaName;
    tenant.domain = domain;

    await this.tenantRepository.save(tenant);

    // Create the schema in PostgreSQL
    await this.createSchema(schemaName);
    await this.createSchemaTables(schemaName);

    return tenant;
  }

  async findTenantById(id: string): Promise<Tenant> {
    return this.tenantRepository.findOne({ where: { id } });
  }

  async findTenantByDomain(domain: string): Promise<Tenant> {
    return this.tenantRepository.findOne({ where: { domain } });
  }

  async findTenantBySchemaName(schemaName: string): Promise<Tenant> {
    return this.tenantRepository.findOne({ where: { schema_name: schemaName } });
  }

  private async createSchema(schemaName: string): Promise<void> {
    const queryRunner = getConnection().createQueryRunner();
    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    } finally {
      await queryRunner.release();
    }
  }

  private async createSchemaTables(schemaName: string): Promise<void> {
    const queryRunner = getConnection().createQueryRunner();
    try {
      // Create users table in tenant schema
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."users" (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          status BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create invoices table in tenant schema
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."invoices" (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES "${schemaName}"."users"(id),
          amount DECIMAL(10, 2) NOT NULL,
          status VARCHAR(50) NOT NULL,
          due_date TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } finally {
      await queryRunner.release();
    }
  }

  async getTenantSchema(tenantId: string): Promise<string> {
    const tenant = await this.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant.schema_name;
  }
}
