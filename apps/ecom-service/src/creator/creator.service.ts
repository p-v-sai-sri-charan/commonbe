import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { SetByokDto } from './dto/byok.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { CreatorProfile, CreatorProfileDocument } from './schemas/creator-profile.schema';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { PayoutRequest, PayoutRequestDocument } from './schemas/payout-request.schema';
import { AdminConfig, AdminConfigDocument } from '../admin/schemas/admin-config.schema';

const ALGORITHM = 'aes-256-cbc';

@Injectable()
export class CreatorService {
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(PayoutRequest.name) private readonly payoutModel: Model<PayoutRequestDocument>,
    @InjectModel(AdminConfig.name) private readonly adminConfigModel: Model<AdminConfigDocument>,
    private readonly configService: ConfigService,
  ) {
    const keyHex = this.configService.get<string>('BYOK_ENCRYPTION_KEY', '').padEnd(64, '0');
    this.encryptionKey = Buffer.from(keyHex.slice(0, 64), 'hex');
  }

  async register(userId: string, dto: CreateCreatorProfileDto): Promise<CreatorProfile> {
    const existing = await this.creatorModel.findOne({ userId });
    if (existing) throw new ConflictException('Already registered as creator');

    const slugTaken = await this.creatorModel.findOne({ slug: dto.slug });
    if (slugTaken) throw new ConflictException('Slug already taken');

    return this.creatorModel.create({ userId, ...dto });
  }

  async getByUserId(userId: string): Promise<CreatorProfile> {
    const creator = await this.creatorModel.findOne({ userId });
    if (!creator) throw new NotFoundException('Creator profile not found');
    return creator;
  }

  async getBySlug(slug: string): Promise<CreatorProfile> {
    const creator = await this.creatorModel.findOne({ slug });
    if (!creator) throw new NotFoundException('Creator not found');
    return creator;
  }

  async update(userId: string, dto: UpdateCreatorProfileDto): Promise<CreatorProfile> {
    const creator = await this.creatorModel.findOneAndUpdate({ userId }, dto, { new: true });
    if (!creator) throw new NotFoundException('Creator profile not found');
    return creator;
  }

  async setByok(userId: string, dto: SetByokDto): Promise<void> {
    const creator = await this.creatorModel.findOne({ userId });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const encrypted = this.encrypt(dto.apiKey);
    await this.creatorModel.updateOne(
      { userId },
      { byokProvider: dto.provider, byokApiKeyEncrypted: encrypted },
    );
  }

  async removeByok(userId: string): Promise<void> {
    await this.creatorModel.updateOne(
      { userId },
      { byokProvider: null, byokApiKeyEncrypted: null },
    );
  }

  async getDecryptedByokKey(userId: string): Promise<{ provider: string; apiKey: string } | null> {
    const creator = await this.creatorModel.findOne({ userId }).select('+byokApiKeyEncrypted');
    if (!creator || !creator.byokApiKeyEncrypted || !creator.byokProvider) return null;

    return {
      provider: creator.byokProvider,
      apiKey: this.decrypt(creator.byokApiKeyEncrypted),
    };
  }

  async addEarnings(userId: string, amountPaise: number): Promise<void> {
    await this.creatorModel.updateOne(
      { userId },
      { $inc: { totalEarningsPaise: amountPaise, pendingEarningsPaise: amountPaise, totalSales: 1 } },
    );
  }

  // ── Payout requests ─────────────────────────────────────────────────────────

  async createPayoutRequest(userId: string, dto: CreatePayoutRequestDto): Promise<PayoutRequest> {
    const creator = await this.creatorModel.findOne({ userId });
    if (!creator) throw new NotFoundException('Creator profile not found');

    if (creator.pendingEarningsPaise < dto.creditsUsed) {
      throw new BadRequestException('Insufficient pending earnings');
    }

    // Payouts redeem pending EARNINGS (paise). Rates are "paise of value per ₹1 (100 paise)
    // redeemed": cash 100 = 1:1 real money; discount defaults higher (e.g. 120 = +20% store
    // credit) to reward keeping value on-platform. Admin tunes both in /admin/config.
    const adminConfig = await this.adminConfigModel.findOne({ key: 'singleton' });
    const cashRate = adminConfig?.creditCashRatePaise ?? 100;
    const discountRate = adminConfig?.creditDiscountRatePaise ?? 120;
    const ratePerHundred = dto.type === 'cash' ? cashRate : discountRate;
    const valuePaise = Math.floor((dto.creditsUsed / 100) * ratePerHundred);

    // Deduct pending earnings optimistically
    await this.creatorModel.updateOne(
      { userId },
      { $inc: { pendingEarningsPaise: -dto.creditsUsed } },
    );

    return this.payoutModel.create({
      userId,
      creatorId: (creator as any)._id.toString(),
      type: dto.type,
      creditsUsed: dto.creditsUsed,
      valuePaise,
      paymentDetails: dto.paymentDetails ?? null,
    });
  }

  async getMyPayoutRequests(userId: string): Promise<PayoutRequest[]> {
    return this.payoutModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getAllPayoutRequests(status?: string): Promise<PayoutRequest[]> {
    const filter = status ? { status } : {};
    return this.payoutModel.find(filter).sort({ createdAt: -1 });
  }

  async updatePayoutStatus(
    requestId: string,
    status: 'approved' | 'rejected' | 'completed',
    adminNote?: string,
  ): Promise<PayoutRequest> {
    const payout = await this.payoutModel.findById(requestId);
    if (!payout) throw new NotFoundException('Payout request not found');

    if (status === 'rejected' && payout.status === 'pending') {
      // Refund the deducted earnings on rejection
      await this.creatorModel.updateOne(
        { userId: payout.userId },
        { $inc: { pendingEarningsPaise: payout.creditsUsed } },
      );
    }

    payout.status = status;
    if (adminNote) payout.adminNote = adminNote;
    return payout.save();
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
