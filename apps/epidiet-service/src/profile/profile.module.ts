import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { EpidietProfile, EpidietProfileSchema } from './schemas/epidiet-profile.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: EpidietProfile.name, schema: EpidietProfileSchema }])],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
