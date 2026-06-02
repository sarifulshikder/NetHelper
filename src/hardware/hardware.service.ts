import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { OltDevice, DeviceStatus, HardwareType } from './olt-device.entity';
import { OnuDevice, OnuStatus } from './onu-device.entity';
import { SnmpService } from './snmp.service';
import { SshService } from './ssh.service';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  constructor(
    @InjectRepository(OltDevice)
    private oltRepository: Repository<OltDevice>,
    @InjectRepository(OnuDevice)
    private onuRepository: Repository<OnuDevice>,
    private readonly snmpService: SnmpService,
    private readonly sshService: SshService,
  ) {}

  async createOltDevice(
    schemaName: string,
    oltData: {
      name: string;
      ip_address: string;
      hardware_type?: HardwareType;
      snmp_community?: string;
      snmp_port?: number;
      ssh_username?: string;
      ssh_password?: string;
      ssh_port?: number;
      total_pon_ports?: number;
      location?: string;
      notes?: string;
    },
  ): Promise<OltDevice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const olt = connection.manager.create(OltDevice, {
        ...oltData,
        hardware_type: oltData.hardware_type || HardwareType.GPON,
        snmp_port: oltData.snmp_port || 161,
        ssh_port: oltData.ssh_port || 22,
        total_pon_ports: oltData.total_pon_ports || 16,
        status: DeviceStatus.OFFLINE,
      });

      return await connection.manager.save(OltDevice, olt);
    } catch (error) {
      this.logger.error(`Failed to create OLT device: ${error.message}`);
      throw error;
    }
  }

  async getOltDeviceById(schemaName: string, id: string): Promise<OltDevice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const olt = await connection.manager.findOne(OltDevice, {
        where: { id },
        relations: ['onus'],
      });

      if (!olt) {
        throw new NotFoundException('OLT device not found');
      }

      return olt;
    } catch (error) {
      this.logger.error(`Failed to get OLT device: ${error.message}`);
      throw error;
    }
  }

  async getAllOltDevices(schemaName: string): Promise<OltDevice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(OltDevice, {
        relations: ['onus'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get OLT devices: ${error.message}`);
      throw error;
    }
  }

  async updateOltDevice(
    schemaName: string,
    id: string,
    updateData: Partial<OltDevice>,
  ): Promise<OltDevice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const olt = await connection.manager.findOne(OltDevice, {
        where: { id },
      });

      if (!olt) {
        throw new NotFoundException('OLT device not found');
      }

      Object.assign(olt, updateData);
      return await connection.manager.save(OltDevice, olt);
    } catch (error) {
      this.logger.error(`Failed to update OLT device: ${error.message}`);
      throw error;
    }
  }

  async deleteOltDevice(schemaName: string, id: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      const result = await connection.manager.delete(OltDevice, id);
      if (result.affected === 0) {
        throw new NotFoundException('OLT device not found');
      }
    } catch (error) {
      this.logger.error(`Failed to delete OLT device: ${error.message}`);
      throw error;
    }
  }

  async getOltStatus(schemaName: string, oltId: string): Promise<{
    success: boolean;
    status?: string;
    uptime?: string;
    ponPorts?: Array<{
      port: number;
      status: string;
      onuCount: number;
    }>;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const olt = await this.getOltDeviceById(schemaName, oltId);

      // Get OLT status via SNMP
      const statusResponse = await this.snmpService.getOltStatus(olt);
      if (!statusResponse.success) {
        return { success: false, error: statusResponse.error };
      }

      // Get status for all PON ports
      const ponPorts = [];
      for (let port = 1; port <= olt.total_pon_ports; port++) {
        const portResponse = await this.snmpService.getPonPortStatus(olt, port);
        if (portResponse.success) {
          ponPorts.push({
            port,
            status: portResponse.status,
            onuCount: portResponse.onuCount || 0,
          });
        }
      }

      return {
        success: true,
        status: statusResponse.status,
        uptime: statusResponse.uptime,
        ponPorts,
      };
    } catch (error) {
      this.logger.error(`Failed to get OLT status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async discoverUnconfiguredOnus(
    schemaName: string,
    oltId: string,
  ): Promise<{
    success: boolean;
    onus?: Array<{
      ponPort: number;
      onuIndex: number;
      mac: string;
      serial: string;
      rxPower: number;
      txPower: number;
    }>;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const olt = await this.getOltDeviceById(schemaName, oltId);

      // Discover unconfigured ONUs via SNMP
      const discoveryResponse = await this.snmpService.discoverUnconfiguredOnus(
        olt,
      );

      if (!discoveryResponse.success) {
        return { success: false, error: discoveryResponse.error };
      }

      return {
        success: true,
        onus: discoveryResponse.onus,
      };
    } catch (error) {
      this.logger.error(`Failed to discover ONUs: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async provisionOnu(
    schemaName: string,
    oltId: string,
    ponPort: number,
    onuIndex: number,
    customerId: string,
    profileId: string,
    mac: string,
    serial: string,
  ): Promise<{
    success: boolean;
    onu?: OnuDevice;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const olt = await this.getOltDeviceById(schemaName, oltId);

      // Provision ONU via SSH
      const provisionResponse = await this.sshService.provisionOnu(
        olt,
        ponPort,
        onuIndex,
        customerId,
        profileId,
      );

      if (!provisionResponse.success) {
        return { success: false, error: provisionResponse.error };
      }

      // Create ONU device record
      const onu = connection.manager.create(OnuDevice, {
        customer_id: customerId,
        olt_id: oltId,
        pon_port: ponPort,
        onu_index: onuIndex,
        onu_mac: mac,
        onu_serial: serial,
        status: OnuStatus.ONLINE,
        authorized_at: new Date(),
        profile_id: profileId,
      });

      const savedOnu = await connection.manager.save(OnuDevice, onu);

      return {
        success: true,
        onu: savedOnu,
      };
    } catch (error) {
      this.logger.error(`Failed to provision ONU: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getOnuSignalStatus(
    schemaName: string,
    onuId: string,
  ): Promise<{
    success: boolean;
    rxPower?: number;
    txPower?: number;
    status?: string;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const onu = await connection.manager.findOne(OnuDevice, {
        where: { id: onuId },
        relations: ['olt'],
      });

      if (!onu) {
        throw new NotFoundException('ONU device not found');
      }

      // Get ONU signal levels via SNMP
      const signalResponse = await this.snmpService.getOnuSignalLevels(
        onu.olt,
        onu.pon_port,
        onu.onu_index,
      );

      if (!signalResponse.success) {
        return { success: false, error: signalResponse.error };
      }

      // Update ONU record with latest signal levels
      onu.rx_power_dbm = signalResponse.rxPower;
      onu.tx_power_dbm = signalResponse.txPower;
      onu.status = signalResponse.status as OnuStatus;
      onu.last_seen = new Date();

      await connection.manager.save(OnuDevice, onu);

      return {
        success: true,
        rxPower: signalResponse.rxPower,
        txPower: signalResponse.txPower,
        status: signalResponse.status,
      };
    } catch (error) {
      this.logger.error(`Failed to get ONU signal status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getOnuInfo(
    schemaName: string,
    onuId: string,
  ): Promise<{
    success: boolean;
    info?: any;
    error?: string;
  }> {
    const connection = await getTenantConnection(schemaName);

    try {
      const onu = await connection.manager.findOne(OnuDevice, {
        where: { id: onuId },
        relations: ['olt'],
      });

      if (!onu) {
        throw new NotFoundException('ONU device not found');
      }

      // Get ONU info via SSH
      const infoResponse = await this.sshService.getOnuInfo(
        onu.olt,
        onu.pon_port,
        onu.onu_index,
      );

      if (!infoResponse.success) {
        return { success: false, error: infoResponse.error };
      }

      return {
        success: true,
        info: infoResponse.info,
      };
    } catch (error) {
      this.logger.error(`Failed to get ONU info: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getOnusByCustomer(
    schemaName: string,
    customerId: string,
  ): Promise<OnuDevice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(OnuDevice, {
        where: { customer_id: customerId },
        relations: ['olt'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get ONUs by customer: ${error.message}`);
      throw error;
    }
  }

  async getOnusByOlt(schemaName: string, oltId: string): Promise<OnuDevice[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(OnuDevice, {
        where: { olt_id: oltId },
        relations: ['olt'],
        order: { pon_port: 'ASC', onu_index: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get ONUs by OLT: ${error.message}`);
      throw error;
    }
  }

  async updateOnuStatus(
    schemaName: string,
    onuId: string,
    status: OnuStatus,
  ): Promise<OnuDevice> {
    const connection = await getTenantConnection(schemaName);

    try {
      const onu = await connection.manager.findOne(OnuDevice, {
        where: { id: onuId },
      });

      if (!onu) {
        throw new NotFoundException('ONU device not found');
      }

      onu.status = status;
      onu.last_seen = new Date();

      return await connection.manager.save(OnuDevice, onu);
    } catch (error) {
      this.logger.error(`Failed to update ONU status: ${error.message}`);
      throw error;
    }
  }
}
