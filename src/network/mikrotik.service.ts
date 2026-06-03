// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { RouterOSAPI } from 'routeros-api';
import { Client } from 'ssh2';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class MikrotikService {
  private readonly logger = new Logger(MikrotikService.name);

  async testConnection(
    host: string,
    port: number,
    username: string,
    password: string,
    useSSH: boolean = false,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (useSSH) {
        return await this.testSSHConnection(host, port, username, password);
      } else {
        return await this.testAPIConnection(host, port, username, password);
      }
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private async testAPIConnection(
    host: string,
    port: number,
    username: string,
    password: string,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const conn = new RouterOSAPI({
      host,
      port,
      user: username,
      password,
      timeout: 5000,
    });

    try {
      await conn.connect();
      const identity = await conn.write('/system/identity/print');
      const resources = await conn.write('/system/resource/print');
      
      await conn.close();
      
      return {
        success: true,
        message: 'API connection successful',
        data: {
          identity: identity[0],
          resources: resources[0],
        },
      };
    } catch (error) {
      await conn.close();
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  private async testSSHConnection(
    host: string,
    port: number,
    username: string,
    password: string,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const commands = [
        '/system identity print',
        '/system resource print',
      ];
      let resultData = {};

      conn
        .on('ready', () => {
          this.logger.log('SSH connection established');
          
          // Execute commands sequentially
          const executeNext = (index: number) => {
            if (index >= commands.length) {
              conn.end();
              resolve({
                success: true,
                message: 'SSH connection successful',
                data: resultData,
              });
              return;
            }

            conn.exec(commands[index], (err, stream) => {
              if (err) {
                conn.end();
                reject(new Error(`SSH command failed: ${err.message}`));
                return;
              }

              let data = '';
              stream
                .on('data', (chunk) => (data += chunk.toString()))
                .on('end', () => {
                  try {
                    // Parse MikroTik output
                    const lines = data.split('\n');
                    const parsed = {};
                    lines.forEach((line) => {
                      const [key, value] = line.split(':');
                      if (key && value) {
                        parsed[key.trim()] = value.trim();
                      }
                    });
                    
                    if (commands[index].includes('identity')) {
                      resultData.identity = parsed;
                    } else if (commands[index].includes('resource')) {
                      resultData.resources = parsed;
                    }
                    
                    executeNext(index + 1);
                  } catch (parseError) {
                    conn.end();
                    reject(new Error(`Failed to parse output: ${parseError.message}`));
                  }
                });
            });
          };
          
          executeNext(0);
        })
        .on('error', (err) => {
          reject(new Error(`SSH connection failed: ${err.message}`));
        })
        .connect({
          host,
          port,
          username,
          password,
          tryKeyboard: true,
        });
    });
  }

  async getRouterResources(
    host: string,
    port: number,
    username: string,
    password: string,
    useSSH: boolean = false,
  ): Promise<any> {
    try {
      const result = await this.testConnection(host, port, username, password, useSSH);
      if (result.success && result.data) {
        return result.data.resources;
      }
      throw new Error(result.message);
    } catch (error) {
      this.logger.error(`Failed to get router resources: ${error.message}`);
      throw error;
    }
  }

  async addIPPool(
    host: string,
    port: number,
    username: string,
    password: string,
    poolName: string,
    poolRange: string,
    useSSH: boolean = false,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (useSSH) {
        return await this.addIPPoolSSH(host, port, username, password, poolName, poolRange);
      } else {
        return await this.addIPPoolAPI(host, port, username, password, poolName, poolRange);
      }
    } catch (error) {
      this.logger.error(`Failed to add IP pool: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private async addIPPoolAPI(
    host: string,
    port: number,
    username: string,
    password: string,
    poolName: string,
    poolRange: string,
  ): Promise<{ success: boolean; message: string }> {
    const conn = new RouterOSAPI({
      host,
      port,
      user: username,
      password,
      timeout: 5000,
    });

    try {
      await conn.connect();
      await conn.write('/ip/pool/add', [
        '=name=' + poolName,
        '=ranges=' + poolRange,
      ]);
      
      await conn.close();
      return { success: true, message: `IP pool ${poolName} added successfully` };
    } catch (error) {
      await conn.close();
      throw new Error(`API operation failed: ${error.message}`);
    }
  }

  private async addIPPoolSSH(
    host: string,
    port: number,
    username: string,
    password: string,
    poolName: string,
    poolRange: string,
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const command = `/ip pool add name=${poolName} ranges=${poolRange}`;

      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              reject(new Error(`SSH command failed: ${err.message}`));
              return;
            }

            let data = '';
            stream
              .on('data', (chunk) => (data += chunk.toString()))
              .on('end', () => {
                conn.end();
                if (data.includes('failure')) {
                  reject(new Error(`Failed to add IP pool: ${data}`));
                } else {
                  resolve({ success: true, message: `IP pool ${poolName} added successfully` });
                }
              });
          });
        })
        .on('error', (err) => {
          reject(new Error(`SSH connection failed: ${err.message}`));
        })
        .connect({
          host,
          port,
          username,
          password,
          tryKeyboard: true,
        });
    });
  }

  async getInterfaceStatus(
    host: string,
    port: number,
    username: string,
    password: string,
    interfaceName: string,
    useSSH: boolean = false,
  ): Promise<any> {
    try {
      if (useSSH) {
        return await this.getInterfaceStatusSSH(host, port, username, password, interfaceName);
      } else {
        return await this.getInterfaceStatusAPI(host, port, username, password, interfaceName);
      }
    } catch (error) {
      this.logger.error(`Failed to get interface status: ${error.message}`);
      throw error;
    }
  }

  private async getInterfaceStatusAPI(
    host: string,
    port: number,
    username: string,
    password: string,
    interfaceName: string,
  ): Promise<any> {
    const conn = new RouterOSAPI({
      host,
      port,
      user: username,
      password,
      timeout: 5000,
    });

    try {
      await conn.connect();
      const result = await conn.write('/interface/print', [
        '?.name=' + interfaceName,
      ]);
      
      await conn.close();
      return result[0] || null;
    } catch (error) {
      await conn.close();
      throw new Error(`API operation failed: ${error.message}`);
    }
  }

  private async getInterfaceStatusSSH(
    host: string,
    port: number,
    username: string,
    password: string,
    interfaceName: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const command = `/interface print where name="${interfaceName}"`;

      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              reject(new Error(`SSH command failed: ${err.message}`));
              return;
            }

            let data = '';
            stream
              .on('data', (chunk) => (data += chunk.toString()))
              .on('end', () => {
                conn.end();
                try {
                  // Parse MikroTik output
                  const lines = data.split('\n');
                  const parsed = {};
                  lines.forEach((line) => {
                    const [key, value] = line.split(':');
                    if (key && value) {
                      parsed[key.trim()] = value.trim();
                    }
                  });
                  resolve(parsed);
                } catch (parseError) {
                  reject(new Error(`Failed to parse output: ${parseError.message}`));
                }
              });
          });
        })
        .on('error', (err) => {
          reject(new Error(`SSH connection failed: ${err.message}`));
        })
        .connect({
          host,
          port,
          username,
          password,
          tryKeyboard: true,
        });
    });
  }
}
