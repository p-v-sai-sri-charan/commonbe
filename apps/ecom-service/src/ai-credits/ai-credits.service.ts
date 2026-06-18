import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiCredit, AiCreditDocument } from './schemas/ai-credit.schema';
import {
  AiCreditTransaction,
  AiCreditTransactionDocument,
  CreditReason,
} from './schemas/ai-credit-transaction.schema';

@Injectable()
export class AiCreditsService {
  constructor(
    @InjectModel(AiCredit.name) private readonly creditModel: Model<AiCreditDocument>,
    @InjectModel(AiCreditTransaction.name)
    private readonly txModel: Model<AiCreditTransactionDocument>,
  ) {}

  async getBalance(userId: string): Promise<AiCredit> {
    const credit = await this.creditModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, balance: 0, lifetimeEarned: 0, lifetimeUsed: 0 } },
      { upsert: true, new: true },
    );
    return credit;
  }

  async grant(userId: string, amount: number, reason: CreditReason, referenceId?: string): Promise<void> {
    await Promise.all([
      this.creditModel.findOneAndUpdate(
        { userId },
        { $inc: { balance: amount, lifetimeEarned: amount }, $setOnInsert: { userId } },
        { upsert: true },
      ),
      this.txModel.create({ userId, amount, reason, referenceId: referenceId ?? null }),
    ]);
  }

  async consume(userId: string, amount: number, referenceId?: string): Promise<void> {
    const credit = await this.creditModel.findOne({ userId });
    if (!credit || credit.balance < amount) {
      throw new BadRequestException('Insufficient AI credits');
    }

    await Promise.all([
      this.creditModel.updateOne(
        { userId },
        { $inc: { balance: -amount, lifetimeUsed: amount } },
      ),
      this.txModel.create({ userId, amount: -amount, reason: 'generation', referenceId: referenceId ?? null }),
    ]);
  }

  async getTransactions(userId: string, limit = 20): Promise<AiCreditTransaction[]> {
    return this.txModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  async adminGrant(userId: string, amount: number): Promise<void> {
    return this.grant(userId, amount, 'admin_grant');
  }
}
