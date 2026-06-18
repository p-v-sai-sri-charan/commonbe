import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { EpidietProfile, EpidietProfileDocument } from './schemas/epidiet-profile.schema';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(EpidietProfile.name) private readonly profileModel: Model<EpidietProfileDocument>,
  ) {}

  async upsertProfile(authUserId: string, dto: UpsertProfileDto): Promise<EpidietProfile> {
    return this.profileModel.findOneAndUpdate(
      { authUserId },
      { $set: { ...dto, authUserId } },
      { new: true, upsert: true },
    );
  }

  async getProfile(authUserId: string): Promise<EpidietProfileDocument> {
    const profile = await this.profileModel.findOne({ authUserId });
    if (!profile) {
      throw new NotFoundException('Epidiet profile not found — call POST /epidiet/profile first');
    }
    return profile;
  }

  async findProfileOrNull(authUserId: string): Promise<EpidietProfileDocument | null> {
    return this.profileModel.findOne({ authUserId });
  }
}
