import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { KYCProfile, KYCStatus, IdentityType } from './kyc.entity';
import { User } from '../users/user.entity';
import { RadiusService } from '../radius/radius.service';
import { getTenantConnection } from '../core/tenant-connection.provider';

@Injectable()
export class KYCService {
  private readonly logger = new Logger(KYCService.name);

  constructor(
    @InjectRepository(KYCProfile)
    private kycRepository: Repository<KYCProfile>,
    private readonly radiusService: RadiusService,
  ) {}

  async createKYCProfile(
    schemaName: string,
    userId: string,
    kycData: {
      identity_type: IdentityType;
      identity_number: string;
      identity_front_path?: string;
      identity_back_path?: string;
      selfie_path?: string;
    },
  ): Promise<KYCProfile> {
    const connection = await getTenantConnection(schemaName);

    try {
      // Verify user exists
      const user = await connection.manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if KYC already exists for this user
      const existingKYC = await connection.manager.findOne(KYCProfile, {
        where: { user_id: userId },
      });
      if (existingKYC) {
        throw new BadRequestException('KYC profile already exists for this user');
      }

      const kycProfile = connection.manager.create(KYCProfile, {
        user_id: userId,
        ...kycData,
        status: KYCStatus.PENDING,
      });

      return await connection.manager.save(KYCProfile, kycProfile);
    } catch (error) {
      this.logger.error(`Failed to create KYC profile: ${error.message}`);
      throw error;
    }
  }

  async getKYCProfileById(schemaName: string, id: string): Promise<KYCProfile> {
    const connection = await getTenantConnection(schemaName);

    try {
      const kycProfile = await connection.manager.findOne(KYCProfile, {
        where: { id },
        relations: ['user'],
      });
      if (!kycProfile) {
        throw new NotFoundException('KYC profile not found');
      }
      return kycProfile;
    } catch (error) {
      this.logger.error(`Failed to get KYC profile: ${error.message}`);
      throw error;
    }
  }

  async getKYCProfileByUserId(
    schemaName: string,
    userId: string,
  ): Promise<KYCProfile> {
    const connection = await getTenantConnection(schemaName);

    try {
      const kycProfile = await connection.manager.findOne(KYCProfile, {
        where: { user_id: userId },
        relations: ['user'],
      });
      if (!kycProfile) {
        throw new NotFoundException('KYC profile not found');
      }
      return kycProfile;
    } catch (error) {
      this.logger.error(`Failed to get KYC profile by user: ${error.message}`);
      throw error;
    }
  }

  async updateKYCProfile(
    schemaName: string,
    id: string,
    updateData: Partial<KYCProfile>,
  ): Promise<KYCProfile> {
    const connection = await getTenantConnection(schemaName);

    try {
      const kycProfile = await connection.manager.findOne(KYCProfile, {
        where: { id },
      });
      if (!kycProfile) {
        throw new NotFoundException('KYC profile not found');
      }

      Object.assign(kycProfile, updateData);
      return await connection.manager.save(KYCProfile, kycProfile);
    } catch (error) {
      this.logger.error(`Failed to update KYC profile: ${error.message}`);
      throw error;
    }
  }

  async updateKYCStatus(
    schemaName: string,
    id: string,
    status: KYCStatus,
    verifiedBy?: string,
    rejectionReason?: string,
  ): Promise<KYCProfile> {
    const connection = await getTenantConnection(schemaName);

    try {
      const kycProfile = await connection.manager.findOne(KYCProfile, {
        where: { id },
        relations: ['user'],
      });
      if (!kycProfile) {
        throw new NotFoundException('KYC profile not found');
      }

      kycProfile.status = status;
      kycProfile.verified_by = verifiedBy;
      kycProfile.verified_at = new Date();

      if (status === KYCStatus.REJECTED && rejectionReason) {
        kycProfile.rejection_reason = rejectionReason;
      }

      const updatedProfile = await connection.manager.save(
        KYCProfile,
        kycProfile,
      );

      // If KYC is approved, ensure the user can be activated on RADIUS
      if (status === KYCStatus.APPROVED) {
        await this.ensureUserCanBeActivated(schemaName, kycProfile.user_id);
      }

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Failed to update KYC status: ${error.message}`);
      throw error;
    }
  }

  private async ensureUserCanBeActivated(
    schemaName: string,
    userId: string,
  ): Promise<void> {
    // This method ensures that a user with approved KYC can be activated on RADIUS
    // In a real implementation, this would update the user's status or trigger
    // the activation process in the RADIUS system
    this.logger.log(`User ${userId} is now eligible for RADIUS activation (KYC approved)`);
  }

  async canUserBeActivated(schemaName: string, userId: string): Promise<boolean> {
    const connection = await getTenantConnection(schemaName);

    try {
      const kycProfile = await connection.manager.findOne(KYCProfile, {
        where: { user_id: userId },
      });

      if (!kycProfile) {
        return false; // No KYC profile means cannot be activated
      }

      return kycProfile.status === KYCStatus.APPROVED;
    } catch (error) {
      this.logger.error(`Failed to check user activation eligibility: ${error.message}`);
      return false;
    }
  }

  async getAllKYCProfiles(schemaName: string): Promise<KYCProfile[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(KYCProfile, {
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get all KYC profiles: ${error.message}`);
      throw error;
    }
  }

  async getKYCProfilesByStatus(
    schemaName: string,
    status: KYCStatus,
  ): Promise<KYCProfile[]> {
    const connection = await getTenantConnection(schemaName);

    try {
      return await connection.manager.find(KYCProfile, {
        where: { status },
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get KYC profiles by status: ${error.message}`);
      throw error;
    }
  }

  async deleteKYCProfile(schemaName: string, id: string): Promise<void> {
    const connection = await getTenantConnection(schemaName);

    try {
      const result = await connection.manager.delete(KYCProfile, id);
      if (result.affected === 0) {
        throw new NotFoundException('KYC profile not found');
      }
    } catch (error) {
      this.logger.error(`Failed to delete KYC profile: ${error.message}`);
      throw error;
    }
  }
}
