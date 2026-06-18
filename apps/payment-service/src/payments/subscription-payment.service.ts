import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { CreateSubscriptionOrderDto } from './dto/create-subscription-order.dto';
import { VerifySubscriptionDto } from './dto/verify-subscription.dto';
import { getPlanPrice } from './subscription-prices';
import {
  PaymentStatus,
  PaymentTransaction,
  PaymentTransactionDocument,
} from './schemas/payment-transaction.schema';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);
  private readonly keySecret: string;
  private readonly keyId: string;
  private readonly userServiceUrl: string;

  constructor(
    @InjectModel(PaymentTransaction.name)
    private readonly transactionModel: Model<PaymentTransactionDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.keyId = this.configService.get('RAZORPAY_KEY_ID', '');
    this.keySecret = this.configService.get('RAZORPAY_KEY_SECRET', '');
    this.userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://localhost:3002',
    );
  }

  async createSubscriptionOrder(authUserId: string, dto: CreateSubscriptionOrderDto) {
    const plan = getPlanPrice(dto.planId);
    if (!plan) {
      throw new BadRequestException(`Unknown plan: ${dto.planId}`);
    }

    // Create an audit record before hitting Razorpay
    const transaction = await this.transactionModel.create({
      authUserId,
      provider: 'razorpay',
      amount: plan.priceInPaise,
      currency: 'INR',
      status: PaymentStatus.CREATED,
      providerOrderId: `pending_${crypto.randomUUID()}`,
      metadata: { planId: dto.planId, type: 'subscription' },
    });

    let providerOrderId: string;

    if (this.keyId && this.keySecret) {
      // Real Razorpay order via REST API (Basic auth: key_id:key_secret)
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      try {
        const rzpResponse = await firstValueFrom(
          this.httpService.post(
            `${RAZORPAY_API}/orders`,
            {
              amount: plan.priceInPaise,
              currency: 'INR',
              receipt: transaction._id.toString(),
              notes: { planId: dto.planId, userId: authUserId },
            },
            { headers: { Authorization: `Basic ${auth}` } },
          ),
        );
        providerOrderId = rzpResponse.data.id as string;
        this.logger.log(`Razorpay order created: ${providerOrderId} for user ${authUserId}`);
      } catch (err) {
        this.logger.error(`Razorpay order creation failed: ${(err as Error).message}`);
        throw new BadRequestException('Payment gateway error — please try again');
      }
    } else {
      // Dev fallback: mock order ID when credentials are not configured
      providerOrderId = `order_dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      this.logger.warn(`[dev] No Razorpay credentials — using mock order ${providerOrderId}`);
    }

    transaction.providerOrderId = providerOrderId;
    await transaction.save();

    return {
      orderId: providerOrderId,
      amount: plan.priceInPaise,
      currency: 'INR',
      planId: dto.planId,
      planDisplayName: plan.displayName,
      keyId: this.keyId,
      transactionId: transaction._id,
    };
  }

  async verifySubscriptionPayment(authUserId: string, dto: VerifySubscriptionDto) {
    const transaction = await this.transactionModel.findOne({
      authUserId,
      providerOrderId: dto.razorpayOrderId,
      'metadata.type': 'subscription',
    });

    if (!transaction) {
      throw new BadRequestException('No matching subscription order found');
    }

    // Verify Razorpay HMAC-SHA256 signature when credentials are present.
    // In dev (no key_secret configured) we skip so mock orders still work.
    if (this.keySecret) {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
        .digest('hex');
      if (expectedSignature !== dto.razorpaySignature) {
        throw new BadRequestException('Invalid payment signature');
      }
    }

    transaction.status = PaymentStatus.SUCCESS;
    transaction.providerPaymentId = dto.razorpayPaymentId;
    await transaction.save();

    // Notify user-service to activate the subscription (fire-and-forget on failure)
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.userServiceUrl}/users/subscription/internal/apply`,
          {
            planId: dto.planId,
            razorpayOrderId: dto.razorpayOrderId,
            razorpayPaymentId: dto.razorpayPaymentId,
          },
          { headers: { 'x-user-id': authUserId } },
        ),
      );
    } catch (err) {
      this.logger.error(
        `Failed to apply subscription for user ${authUserId}: ${(err as Error).message}`,
      );
    }

    return { success: true, transactionId: transaction._id, planId: dto.planId };
  }
}
