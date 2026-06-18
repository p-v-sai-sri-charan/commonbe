import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  CreateOrderResult,
  PaymentProvider,
  PaymentProviderId,
  VerifyPaymentResult,
} from './payment-provider.interface';

/**
 * Placeholder PayU integration.
 *
 * Real implementation: build the PayU hash as
 *   sha512(key|txnid|amount|productinfo|firstname|email|...||||||SALT)
 * and redirect the client to PayU's hosted checkout with that hash.
 *
 * Verification: PayU posts back a response hash computed in reverse order
 * with your SALT; recompute and compare.
 */
@Injectable()
export class PayuProvider implements PaymentProvider {
  readonly id = PaymentProviderId.PAYU;
  private readonly logger = new Logger(PayuProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.get<string>('PAYMENT_PAYU_ENABLED') === 'true';
  }

  async createOrder(amount: number, currency: string, receiptId: string): Promise<CreateOrderResult> {
    if (!this.isEnabled()) {
      throw new BadRequestException('PayU is not enabled');
    }
    const merchantKey = this.configService.get<string>('PAYU_MERCHANT_KEY');
    // TODO: replace with a real PayU hash + hosted-checkout payload.
    const providerOrderId = `payu_txn_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`[payu placeholder] created order ${providerOrderId} for ${amount} ${currency}`);
    return {
      providerOrderId,
      clientPayload: { txnId: providerOrderId, merchantKey, amount, currency, receiptId },
    };
  }

  async verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult> {
    const salt = this.configService.get<string>('PAYU_SALT') ?? '';
    const { providerOrderId, providerPaymentId, hash } = payload as {
      providerOrderId?: string;
      providerPaymentId?: string;
      hash?: string;
    };

    if (!providerOrderId || !providerPaymentId || !hash) {
      return { success: false, raw: payload };
    }

    // TODO: replace with PayU's real reverse-hash formula.
    const expectedHash = crypto.createHash('sha512').update(`${salt}|${providerOrderId}|${providerPaymentId}`).digest('hex');
    const success = expectedHash === hash;
    return { success, providerPaymentId, raw: payload };
  }
}
