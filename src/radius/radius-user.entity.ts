// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'radcheck' })
export class RadiusUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  attribute: string;

  @Column()
  op: string;

  @Column()
  value: string;
}
