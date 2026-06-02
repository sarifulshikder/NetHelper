import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KYCProfile } from './kyc.entity';
import { KYCService } from './kyc.service';
import { KYCController } from './kyc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KYCProfile])],
  providers: [KYCService],
  controllers: [KYCController],
  exports: [KYCService],
})
export class KYCModule {}
