// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class TenantDataService {
  async getTenantProfile(schemaName: string): Promise<any> {
    const connection = await getTenantConnection(schemaName);
    
    try {
      // Example: Query tenant-specific data
      const result = await connection.query(
        `SELECT * FROM "${schemaName}"."users" LIMIT 1`,
      );
      
      return {
        schema: schemaName,
        userCount: result.length,
        sampleUser: result[0] || null,
      };
    } finally {
      // Note: We don't close the connection here to allow connection pooling
      // Connections will be managed by the pool
    }
  }
  
  async createTenantUser(schemaName: string, email: string, password: string): Promise<any> {
    const connection = await getTenantConnection(schemaName);
    
    try {
      const result = await connection.query(
        `INSERT INTO "${schemaName}"."users" (email, password, role, status) VALUES ($1, $2, $3, $4) RETURNING *`,
        [email, password, 'customer', true],
      );
      
      return result[0];
    } finally {
      // Connection pooling management
    }
  }
}
