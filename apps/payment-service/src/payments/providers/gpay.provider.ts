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
 * Placeholder Google Pay (UPI) integration.
 *
 * Google Pay in India is typically reached one of two ways:
 *  1. A UPI deep-link/intent (`upi://pay?pa=...&pn=...&am=...&tr=...`) that
 *     opens the GPay app directly — what this placeholder models.
 *  2. Via a gateway that already supports GPay as a payment method
 *     (Razorpay/PayU "method: upi" with a GPay-specific flow).
 *
 * Verification: confirm payment status either by polling your UPI/PSP
 * provider's status API or via the webhook they send you.
 */
@Injectable()
export class GpayProvider implements PaymentProvider {
  readonly id = PaymentProviderId.GPAY;
  private readonly logger = new Logger(GpayProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.get<string>('PAYMENT_GPAY_ENABLED') === 'true';
  }

  async createOrder(amount: number, currency: string, receiptId: string): Promise<CreateOrderResult> {
    if (!this.isEnabled()) {
      throw new BadRequestException('Google Pay (UPI) is not enabled');
    }
    const payeeVpa = this.configService.get<string>('GPAY_MERCHANT_VPA');
    const payeeName = this.configService.get<string>('GPAY_MERCHANT_ID') ?? 'Merchant';
    // TODO: replace with a real UPI intent string / PSP order creation call.
    const providerOrderId = `upi_txn_${crypto.randomBytes(8).toString('hex')}`;
    const upiIntent = `upi://pay?pa=${payeeVpa ?? 'merchant@upi'}&pn=${encodeURIComponent(payeeName)}&am=${amount}&tr=${providerOrderId}&cu=${currency}`;
    this.logger.log(`[gpay placeholder] created UPI intent ${providerOrderId} for ${amount} ${currency}`);
    return {
      providerOrderId,
      clientPayload: { upiIntent, amount, currency, receiptId },
    };
  }

  async verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult> {
    const { providerOrderId, providerPaymentId, status } = payload as {
      providerOrderId?: string;
      providerPaymentId?: string;
      status?: string;
    };

    if (!providerOrderId || !providerPaymentId) {
      return { success: false, raw: payload };
    }

    // TODO: replace with a real status check against your UPI/PSP provider.
    const success = status === 'SUCCESS';
    return { success, providerPaymentId, raw: payload };
  }
}
