import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum KYCStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum IdentityType {
  NID = 'nid',
  PASSPORT = 'passport',
  BIRTH_CERTIFICATE = 'birth_certificate',
  DRIVING_LICENSE = 'driving_license'
}

@Entity({ name: 'kyc_profiles' })
export class KYCProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: IdentityType,
  })
  identity_type: IdentityType;

  @Column({ unique: true })
  identity_number: string;

  @Column({ nullable: true })
  identity_front_path: string;

  @Column({ nullable: true })
  identity_back_path: string;

  @Column({ nullable: true })
  selfie_path: string;

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING
  })
  status: KYCStatus;

  @Column({ nullable: true })
  verified_by: string;

  @Column({ nullable: true })
  verified_at: Date;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  additional_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
