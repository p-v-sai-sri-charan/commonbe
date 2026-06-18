import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { CreatorProfile, CreatorProfileSchema } from './schemas/creator-profile.schema';
import { PayoutRequest, PayoutRequestSchema } from './schemas/payout-request.schema';
import { AdminConfig, AdminConfigSchema } from '../admin/schemas/admin-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: PayoutRequest.name, schema: PayoutRequestSchema },
      { name: AdminConfig.name, schema: AdminConfigSchema },
    ]),
  ],
  controllers: [CreatorController],
  providers: [CreatorService],
  exports: [CreatorService],
})
export class CreatorModule {}
