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
 * Placeholder Razorpay integration.
 *
 * Real implementation:
 *   const instance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
 *   const order = await instance.orders.create({ amount: amount * 100, currency, receipt: receiptId });
 *
 * Verification: Razorpay sends back order_id + payment_id + signature; recompute
 *   HMAC-SHA256(order_id + "|" + payment_id, key_secret) and compare to signature.
 */
@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly id = PaymentProviderId.RAZORPAY;
  private readonly logger = new Logger(RazorpayProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.get<string>('PAYMENT_RAZORPAY_ENABLED') === 'true';
  }

  async createOrder(amount: number, currency: string, receiptId: string): Promise<CreateOrderResult> {
    if (!this.isEnabled()) {
      throw new BadRequestException('Razorpay is not enabled');
    }
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    // TODO: replace with a real call to the Razorpay SDK once credentials are available.
    const providerOrderId = `order_placeholder_${crypto.randomBytes(8).toString('hex')}`;
    this.logger.log(`[razorpay placeholder] created order ${providerOrderId} for ${amount} ${currency}`);
    return {
      providerOrderId,
      clientPayload: { orderId: providerOrderId, keyId, amount, currency, receiptId },
    };
  }

  async verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult> {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    const { providerOrderId, providerPaymentId, signature } = payload as {
      providerOrderId?: string;
      providerPaymentId?: string;
      signature?: string;
    };

    if (!providerOrderId || !providerPaymentId || !signature) {
      return { success: false, raw: payload };
    }

    // TODO: this placeholder simply recomputes the real Razorpay HMAC formula
    // against the configured secret. Without genuine Razorpay credentials and
    // a genuine webhook payload, this will only succeed in a real integration.
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');

    const success = expectedSignature === signature;
    return { success, providerPaymentId, raw: payload };
  }
}
