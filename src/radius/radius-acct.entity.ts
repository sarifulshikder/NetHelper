// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'radacct' })
export class RadiusAcct {
  @PrimaryGeneratedColumn()
  radacctid: number;

  @Column()
  acctsessionid: string;

  @Column()
  acctuniqueid: string;

  @Column()
  username: string;

  @Column()
  realm: string;

  @Column()
  nasipaddress: string;

  @Column()
  nasportid: string;

  @Column()
  nasporttype: string;

  @Column()
  acctstarttime: Date;

  @Column({ nullable: true })
  acctstoptime: Date;

  @Column({ nullable: true })
  acctsessiontime: number;

  @Column({ nullable: true })
  acctinputoctets: number;

  @Column({ nullable: true })
  acctoutputoctets: number;

  @Column({ nullable: true })
  calledstationid: string;

  @Column({ nullable: true })
  callingstationid: string;

  @Column({ nullable: true })
  acctterminatecause: string;

  @Column({ nullable: true })
  servicetype: string;

  @Column({ nullable: true })
  framedprotocol: string;

  @Column({ nullable: true })
  framedipaddress: string;
}
