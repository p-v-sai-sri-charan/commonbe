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
 * Placeholder PhonePe integration.
 *
 * Real implementation: build the base64 payload + checksum as
 *   sha256(base64(payload) + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX
 * and POST to PhonePe's /pg/v1/pay endpoint.
 *
 * Verification: call PhonePe's status-check API and/or validate the
 * X-VERIFY checksum on their callback the same way.
 */
@Injectable()
export class PhonepeProvider implements PaymentProvider {
  readonly id = PaymentProviderId.PHONEPE;
  private readonly logger = new Logger(PhonepeProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.get<string>('PAYMENT_PHONEPE_ENABLED') === 'true';
  }

  async createOrder(amount: number, currency: string, receiptId: string): Promise<CreateOrderResult> {
    if (!this.isEnabled()) {
      throw new BadRequestException('PhonePe is not enabled');
    }
    const merchantId = this.configService.get<string>('PHONEPE_MERCHANT_ID');
    // TODO: replace with a real call to PhonePe's /pg/v1/pay endpoint.
    const providerOrderId = `phonepe_txn_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`[phonepe placeholder] created order ${providerOrderId} for ${amount} ${currency}`);
    return {
      providerOrderId,
      clientPayload: { merchantTransactionId: providerOrderId, merchantId, amount, currency, receiptId },
    };
  }

  async verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult> {
    const saltKey = this.configService.get<string>('PHONEPE_SALT_KEY') ?? '';
    const saltIndex = this.configService.get<string>('PHONEPE_SALT_INDEX') ?? '1';
    const { providerOrderId, providerPaymentId, checksum } = payload as {
      providerOrderId?: string;
      providerPaymentId?: string;
      checksum?: string;
    };

    if (!providerOrderId || !providerPaymentId || !checksum) {
      return { success: false, raw: payload };
    }

    // TODO: replace with PhonePe's real checksum formula (base64 payload + salt).
    const expectedChecksum =
      crypto.createHash('sha256').update(`${providerOrderId}${providerPaymentId}${saltKey}`).digest('hex') +
      `###${saltIndex}`;
    const success = expectedChecksum === checksum;
    return { success, providerPaymentId, raw: payload };
  }
}
