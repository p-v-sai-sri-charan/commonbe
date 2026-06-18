import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { GpayProvider } from './providers/gpay.provider';
import { PaymentProvider, PaymentProviderId } from './providers/payment-provider.interface';
import { PayuProvider } from './providers/payu.provider';
import { PhonepeProvider } from './providers/phonepe.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaymentStatus, PaymentTransaction, PaymentTransactionDocument } from './schemas/payment-transaction.schema';

@Injectable()
export class PaymentsService {
  private readonly providers: Map<PaymentProviderId, PaymentProvider>;

  constructor(
    @InjectModel(PaymentTransaction.name) private readonly transactionModel: Model<PaymentTransactionDocument>,
    razorpay: RazorpayProvider,
    payu: PayuProvider,
    phonepe: PhonepeProvider,
    gpay: GpayProvider,
  ) {
    this.providers = new Map([razorpay, payu, phonepe, gpay].map((provider) => [provider.id, provider]));
  }

  /** Enabled/disabled is purely env-driven — see each provider's isEnabled(). */
  listProviders() {
    return Array.from(this.providers.values()).map((provider) => ({
      id: provider.id,
      enabled: provider.isEnabled(),
    }));
  }

  private getEnabledProvider(id: PaymentProviderId): PaymentProvider {
    const provider = this.providers.get(id);
    if (!provider || !provider.isEnabled()) {
      throw new BadRequestException(`Payment provider "${id}" is not enabled`);
    }
    return provider;
  }

  async createOrder(authUserId: string, dto: CreateOrderDto) {
    const provider = this.getEnabledProvider(dto.provider);
    const currency = dto.currency ?? 'INR';

    // Create the local record first so we always have an audit trail, even
    // if the provider call below fails. providerOrderId is filled in with
    // the real value once the provider responds.
    const transaction = await this.transactionModel.create({
      authUserId,
      provider: dto.provider,
      amount: dto.amount,
      currency,
      status: PaymentStatus.CREATED,
      providerOrderId: `pending_${crypto.randomUUID()}`,
      metadata: dto.metadata,
    });

    const { providerOrderId, clientPayload } = await provider.createOrder(
      dto.amount,
      currency,
      transaction._id.toString(),
    );

    transaction.providerOrderId = providerOrderId;
    await transaction.save();

    return { transaction, clientPayload };
  }

  async verifyPayment(authUserId: string, dto: VerifyPaymentDto) {
    const provider = this.getEnabledProvider(dto.provider);

    const transaction = await this.transactionModel.findOne({
      authUserId,
      provider: dto.provider,
      providerOrderId: dto.providerOrderId,
    });
    if (!transaction) {
      throw new BadRequestException('No matching order found for this user/provider/providerOrderId');
    }

    const result = await provider.verifyPayment({
      providerOrderId: dto.providerOrderId,
      providerPaymentId: dto.providerPaymentId,
      ...dto.payload,
    });

    transaction.status = result.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    transaction.providerPaymentId = result.providerPaymentId ?? transaction.providerPaymentId;
    await transaction.save();

    return { transaction, verification: result };
  }
}
