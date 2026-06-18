import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { GpayProvider } from './providers/gpay.provider';
import { PayuProvider } from './providers/payu.provider';
import { PhonepeProvider } from './providers/phonepe.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaymentTransaction, PaymentTransactionSchema } from './schemas/payment-transaction.schema';
import { SubscriptionPaymentService } from './subscription-payment.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: PaymentTransaction.name, schema: PaymentTransactionSchema }]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SubscriptionPaymentService,
    RazorpayProvider,
    PayuProvider,
    PhonepeProvider,
    GpayProvider,
  ],
})
export class PaymentsModule {}
