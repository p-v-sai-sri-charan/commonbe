import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateStoreProfileDto } from './dto/create-store-profile.dto';
import { UpdateStoreProfileDto } from './dto/update-store-profile.dto';
import { StoreProfile, StoreProfileDocument } from './schemas/store-profile.schema';

@Injectable()
export class StoreService {
  constructor(@InjectModel(StoreProfile.name) private readonly storeModel: Model<StoreProfileDocument>) {}

  async register(userId: string, dto: CreateStoreProfileDto): Promise<StoreProfile> {
    const existing = await this.storeModel.findOne({ userId });
    if (existing) throw new ConflictException('Already registered a store');

    const slugTaken = await this.storeModel.findOne({ slug: dto.slug });
    if (slugTaken) throw new ConflictException('Slug already taken');

    return this.storeModel.create({ userId, ...dto });
  }

  async getByUserId(userId: string): Promise<StoreProfile> {
    const store = await this.storeModel.findOne({ userId });
    if (!store) throw new NotFoundException('Store profile not found');
    return store;
  }

  async getBySlug(slug: string): Promise<StoreProfile> {
    const store = await this.storeModel.findOne({ slug });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async update(userId: string, dto: UpdateStoreProfileDto): Promise<StoreProfile> {
    const store = await this.storeModel.findOneAndUpdate({ userId }, dto, { new: true });
    if (!store) throw new NotFoundException('Store profile not found');
    return store;
  }

  async addEarnings(userId: string, amountPaise: number): Promise<void> {
    await this.storeModel.updateOne(
      { userId },
      { $inc: { totalEarningsPaise: amountPaise, totalSales: 1 } },
    );
  }
}
