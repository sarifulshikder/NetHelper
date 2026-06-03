// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { RadiusUser } from './radius-user.entity';
import { RadiusReply } from './radius-reply.entity';
import { RadiusAcct } from './radius-acct.entity';
import { getTenantConnection } from '../core/tenant-connection.provider';
import * as dgram from 'dgram';

@Injectable()
export class RadiusService {
  private readonly logger = new Logger(RadiusService.name);

  constructor(
    @InjectRepository(RadiusUser)
    private radiusUserRepository: Repository<RadiusUser>,
    @InjectRepository(RadiusReply)
    private radiusReplyRepository: Repository<RadiusReply>,
    @InjectRepository(RadiusAcct)
    private radiusAcctRepository: Repository<RadiusAcct>,
  ) {}

  async createRadiusUser(
    schemaName: string,
    username: string,
    password: string,
    profileAttributes: { [key: string]: string } = {},
  ): Promise<{ success: boolean; message: string }> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Create user in radcheck table
      await connection.manager.insert(RadiusUser, {
        username,
        attribute: 'Cleartext-Password',
        op: ':=',
        value: password,
      });

      // Add profile attributes to radreply table
      for (const [attribute, value] of Object.entries(profileAttributes)) {
        await connection.manager.insert(RadiusReply, {
          username,
          attribute,
          op: ':=',
          value,
        });
      }

      return {
        success: true,
        message: `RADIUS user ${username} created successfully in schema ${schemaName}`,
      };
    } catch (error) {
      this.logger.error(`Failed to create RADIUS user: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async updateUserStatus(
    schemaName: string,
    username: string,
    enabled: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const user = await connection.manager.findOne(RadiusUser, { where: { username } });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update user status by modifying the password attribute
      await connection.manager.update(
        RadiusUser,
        { username },
        { value: enabled ? user.value : 'DISABLED' },
      );

      return {
        success: true,
        message: `User ${username} status updated to ${enabled ? 'enabled' : 'disabled'}`,
      };
    } catch (error) {
      this.logger.error(`Failed to update user status: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async disconnectUser(
    nasIp: string,
    nasPort: number,
    username: string,
    secret: string = 'testing123',
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const client = dgram.createSocket('udp4');
      const packet = this.createDisconnectPacket(nasIp, nasPort, username, secret);

      client.send(
        packet,
        0,
        packet.length,
        1700,
        nasIp,
        (error) => {
          client.close();
          if (error) {
            this.logger.error(`Failed to send PoD: ${error.message}`);
            resolve({ success: false, message: error.message });
          } else {
            resolve({
              success: true,
              message: `Disconnect request sent to ${username}@${nasIp}:${nasPort}`,
            });
          }
        },
      );
    });
  }

  private createDisconnectPacket(
    nasIp: string,
    nasPort: number,
    username: string,
    secret: string,
  ): Buffer {
    // Simplified PoD packet creation
    // In production, use a proper RADIUS packet library
    const packet = Buffer.alloc(100);
    
    // Code: 40 (CoA-Request)
    packet.writeUInt8(40, 0);
    
    // Identifier
    packet.writeUInt8(1, 1);
    
    // Length
    packet.writeUInt16BE(40, 2);
    
    // Attributes would go here in a real implementation
    
    return packet;
  }

  async createRadiusTables(schemaName: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Create radcheck table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."radcheck" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          attribute VARCHAR(64) NOT NULL,
          op CHAR(2) NOT NULL DEFAULT ':=',
          value VARCHAR(253) NOT NULL
        )
      `);

      // Create radreply table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."radreply" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          attribute VARCHAR(64) NOT NULL,
          op CHAR(2) NOT NULL DEFAULT ':=',
          value VARCHAR(253) NOT NULL
        )
      `);

      // Create radacct table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."radacct" (
          radacctid SERIAL PRIMARY KEY,
          acctsessionid VARCHAR(64) NOT NULL,
          acctuniqueid VARCHAR(32) NOT NULL,
          username VARCHAR(64) NOT NULL,
          realm VARCHAR(64),
          nasipaddress VARCHAR(15) NOT NULL,
          nasportid VARCHAR(15),
          nasporttype VARCHAR(32),
          acctstarttime TIMESTAMP NOT NULL,
          acctstoptime TIMESTAMP,
          acctsessiontime BIGINT,
          acctinputoctets BIGINT,
          acctoutputoctets BIGINT,
          calledstationid VARCHAR(50),
          callingstationid VARCHAR(50),
          acctterminatecause VARCHAR(32),
          servicetype VARCHAR(32),
          framedprotocol VARCHAR(32),
          framedipaddress VARCHAR(15)
        )
      `);

      // Create indexes for performance
      await connection.query(`
        CREATE INDEX IF NOT EXISTS radcheck_username_idx ON "${schemaName}"."radcheck" (username)
      `);
      await connection.query(`
        CREATE INDEX IF NOT EXISTS radreply_username_idx ON "${schemaName}"."radreply" (username)
      `);
      await connection.query(`
        CREATE INDEX IF NOT EXISTS radacct_username_idx ON "${schemaName}"."radacct" (username)
      `);
    } catch (error) {
      this.logger.error(`Failed to create RADIUS tables: ${error.message}`);
      throw error;
    }
  }

  async getActiveSessions(schemaName: string): Promise<any[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      const sessions = await connection.manager.find(RadiusAcct, {
        where: { acctstoptime: null },
        order: { acctstarttime: 'DESC' },
      });
      
      return sessions;
    } catch (error) {
      this.logger.error(`Failed to get active sessions: ${error.message}`);
      throw error;
    }
  }
}
