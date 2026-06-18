import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UserProfile, UserProfileDocument } from './schemas/user-profile.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserProfile.name) private readonly userProfileModel: Model<UserProfileDocument>,
    private readonly configService: ConfigService,
  ) {}

  private generateReferralCode(): string {
    return crypto.randomBytes(5).toString('hex').toUpperCase(); // e.g. "A1B2C3D4E5"
  }

  async createProfile(authUserId: string, dto: CreateProfileDto): Promise<UserProfile> {
    const { referredByCode, ...rest } = dto;
    const defaultAiTokenLimit = Number(this.configService.get('AI_TOKEN_LIMIT_DEFAULT') ?? 1000);

    // Upsert: create the profile on first call, update it on subsequent calls.
    // referralCode/referredByCode/aiTokenLimit are only ever set on insert
    // ($setOnInsert) — they're system-managed and must never be overwritten
    // by a later profile edit.
    return this.userProfileModel.findOneAndUpdate(
      { authUserId },
      {
        $set: { ...rest, authUserId },
        $setOnInsert: {
          referralCode: this.generateReferralCode(),
          referredByCode,
          aiTokenLimit: defaultAiTokenLimit,
        },
      },
      { new: true, upsert: true },
    );
  }

  async getProfile(authUserId: string): Promise<UserProfile> {
    const profile = await this.userProfileModel.findOne({ authUserId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  /**
   * Internal, service-to-service only (not proxied through api-gateway).
   * Decrements the AI token quota, clamped at 0 — never goes negative.
   * Called today by epidiet-service's AI coach; ecom-service will call it too.
   */
  async consumeAiTokens(authUserId: string, amount: number): Promise<UserProfile> {
    const profile = await this.getProfile(authUserId);
    profile.aiTokenLimit = Math.max(0, profile.aiTokenLimit - Math.max(0, amount));
    await (profile as UserProfileDocument).save();
    return profile;
  }
}
