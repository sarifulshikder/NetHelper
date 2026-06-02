import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum JobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

@Entity({ name: 'report_jobs' })
export class ReportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  template_id: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.QUEUED
  })
  status: JobStatus;

  @Column({ type: 'varchar', length: 512, nullable: true })
  file_path_or_url: string;

  @Column({ type: 'integer', default: 0 })
  total_records_processed: number;

  @Column({ type: 'text', nullable: true })
  error_log: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
