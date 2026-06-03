// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { OltDevice } from './olt-device.entity';

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  async executeCommand(
    olt: OltDevice,
    command: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    try {
      // Simulate SSH connection and command execution
      const simulatedResponse = this.simulateSshCommand(olt, command);
      
      if (!simulatedResponse.success) {
        return { success: false, error: simulatedResponse.error };
      }

      return {
        success: true,
        output: simulatedResponse.output,
      };
    } catch (error) {
      this.logger.error(`SSH command execution failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async provisionOnu(
    olt: OltDevice,
    ponPort: number,
    onuIndex: number,
    customerId: string,
    profileId: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    try {
      // Simulate ONU provisioning commands
      const commands = [
        `interface gpon-olt_1/${ponPort}`,
        `onu ${onuIndex} type GPON`,
        `onu ${onuIndex} sn-bind 0 ${onuIndex} ${customerId}`,
        `onu ${onuIndex} profile ${profileId}`,
        `onu ${onuIndex} desc "Customer: ${customerId}"`,
        `onu ${onuIndex} enable`,
        `save`,
      ];

      let combinedOutput = '';
      
      for (const cmd of commands) {
        const result = await this.executeCommand(olt, cmd);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        combinedOutput += result.output + '\n';
      }

      return {
        success: true,
        output: combinedOutput,
      };
    } catch (error) {
      this.logger.error(`ONU provisioning failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getOnuInfo(
    olt: OltDevice,
    ponPort: number,
    onuIndex: number,
  ): Promise<{
    success: boolean;
    info?: any;
    error?: string;
  }> {
    try {
      // Simulate getting ONU info via CLI
      const command = `display onu info ${ponPort} ${onuIndex}`;
      const result = await this.executeCommand(olt, command);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Parse the simulated output
      const info = this.parseOnuInfoOutput(result.output);

      return {
        success: true,
        info,
      };
    } catch (error) {
      this.logger.error(`Failed to get ONU info: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private simulateSshCommand(
    olt: OltDevice,
    command: string,
  ): {
    success: boolean;
    output?: string;
    error?: string;
  } {
    // Simulate different command responses
    const responses: Record<string, string> = {
      'display version': `
System version: V800R019C10SPC800
System time: 2024-01-15 14:30:25
System uptime: 123 days, 4 hours, 30 minutes
`,
      'display device': `
Device name: ${olt.name}
Device type: ${olt.hardware_type.toUpperCase()}
IP address: ${olt.ip_address}
`,
      'display board 0': `
Board 0:
  Board type: GPBD
  Board state: Normal
  Slot: 0
  Subtype: Main
`,
    };

    // Handle ONU provisioning commands
    if (command.includes('onu') && command.includes('enable')) {
      return {
        success: true,
        output: `Info: Succeed to enable the ONU.\nCommand executed successfully.`,
      };
    }

    if (command.includes('save')) {
      return {
        success: true,
        output: 'Saving configuration...\nConfiguration saved successfully.'
      };
    }

    if (command.startsWith('display onu info')) {
      const [_, ponPort, onuIndex] = command.split(' ');
      return {
        success: true,
        output: this.generateSimulatedOnuInfo(ponPort, onuIndex),
      };
    }

    // Default response for unknown commands
    return {
      success: true,
      output: `Command executed: ${command}\n[Simulated response]`,
    };
  }

  private parseOnuInfoOutput(output: string): any {
    // Parse simulated ONU info output
    const lines = output.split('\n');
    const info: any = {};

    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        info[key] = value;
      }
    });

    return info;
  }

  private generateSimulatedOnuInfo(ponPort: string, onuIndex: string): string {
    return `
ONU ${ponPort}/${onuIndex} information:
  ONU ID: ${onuIndex}
  ONU type: GPON
  ONU state: Online
  RX power: -19.5 dBm
  TX power: -18.2 dBm
  Distance: 1250 meters
  MAC address: ${this.generateRandomMacAddress()}
  Serial number: ${this.generateRandomSerialNumber()}
  Last up time: 2024-01-15 10:23:45
  Last down time: -
`;
  }

  private generateRandomMacAddress(): string {
    const hexDigits = '0123456789ABCDEF';
    let mac = '';
    
    for (let i = 0; i < 6; i++) {
      const byte1 = hexDigits.charAt(Math.floor(Math.random() * 16));
      const byte2 = hexDigits.charAt(Math.floor(Math.random() * 16));
      mac += (i > 0 ? ':' : '') + byte1 + byte2;
    }
    
    return mac;
  }

  private generateRandomSerialNumber(): string {
    const chars = '0123456789ABCDEF';
    let serial = 'GPON';
    
    for (let i = 0; i < 8; i++) {
      serial += chars.charAt(Math.floor(Math.random() * 16));
    }
    
    return serial;
  }
}
