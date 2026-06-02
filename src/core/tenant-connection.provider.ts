import { Provider } from '@nestjs/common';
import { getConnection, createConnection, Connection } from 'typeorm';

export const TENANT_CONNECTION = 'TENANT_CONNECTION';

export const tenantConnectionProvider: Provider = {
  provide: TENANT_CONNECTION,
  useFactory: async () => {
    // This will be used to create dynamic connections per tenant
    return null;
  },
};

export async function getTenantConnection(schemaName: string): Promise<Connection> {
  const connectionName = `tenant_${schemaName}`;

  // Check if connection already exists
  try {
    const existingConnection = getConnection(connectionName);
    if (existingConnection) {
      return existingConnection;
    }
  } catch (error) {
    // Connection doesn't exist, create new one
  }

  // Create new connection for the tenant schema
  return createConnection({
    name: connectionName,
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'nethadmin',
    password: process.env.DATABASE_PASSWORD || 'nethpass',
    database: process.env.DATABASE_NAME || 'nethdb',
    schema: schemaName,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    extra: {
      max: 10, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  });
}

export async function closeTenantConnection(schemaName: string): Promise<void> {
  const connectionName = `tenant_${schemaName}`;
  try {
    const connection = getConnection(connectionName);
    await connection.close();
  } catch (error) {
    // Connection doesn't exist or already closed
  }
}
