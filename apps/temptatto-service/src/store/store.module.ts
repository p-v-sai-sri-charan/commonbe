import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreProfile, StoreProfileSchema } from './schemas/store-profile.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: StoreProfile.name, schema: StoreProfileSchema }])],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
