import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiCreditsController } from './ai-credits.controller';
import { AiCreditsService } from './ai-credits.service';
import { AiCredit, AiCreditSchema } from './schemas/ai-credit.schema';
import { AiCreditTransaction, AiCreditTransactionSchema } from './schemas/ai-credit-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiCredit.name, schema: AiCreditSchema },
      { name: AiCreditTransaction.name, schema: AiCreditTransactionSchema },
    ]),
  ],
  controllers: [AiCreditsController],
  providers: [AiCreditsService],
  exports: [AiCreditsService],
})
export class AiCreditsModule {}
