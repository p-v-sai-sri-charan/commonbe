import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac } from 'crypto';
import { Model, Types } from 'mongoose';
import { AiCreditsService } from '../ai-credits/ai-credits.service';
import { CartService } from '../cart/cart.service';
import { CreatorService } from '../creator/creator.service';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Order, OrderDocument } from './schemas/order.schema';

const SHIPPING_COST = 0;
const DESIGN_PURCHASE_BONUS_CREDITS = 20;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    private readonly cartService: CartService,
    private readonly creatorService: CreatorService,
    private readonly aiCreditsService: AiCreditsService,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<{ order: Order; razorpayOrderId: string; amount: number; currency: string; keyId: string }> {
    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const productIds = [...new Set(cart.items.map((i) => i.productId.toString()))];
    const designIds = cart.items.filter((i) => i.designId).map((i) => i.designId!.toString());

    const [products, designs] = await Promise.all([
      this.productModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } }),
      this.designModel.find({ _id: { $in: designIds.map((id) => new Types.ObjectId(id)) } }),
    ]);

    const productMap = new Map(products.map((p) => [(p as any)._id.toString(), p]));
    const designMap = new Map(designs.map((d) => [(d as any)._id.toString(), d]));

    const orderItems = cart.items.map((cartItem) => {
      const product = productMap.get(cartItem.productId.toString());
      if (!product) throw new BadRequestException(`Product ${cartItem.productId} not found`);

      const design = cartItem.designId ? designMap.get(cartItem.designId.toString()) : null;
      const designPrice = design?.price ?? 0;
      const unitPrice = product.basePrice + designPrice;
      const commissionRate = design?.commissionRate ?? 0;
      const commissionAmount = design ? Math.round((unitPrice * commissionRate) / 100) : 0;

      return {
        productId: cartItem.productId,
        designId: cartItem.designId ?? null,
        variantColor: cartItem.variantColor,
        size: cartItem.size,
        quantity: cartItem.quantity,
        unitPrice,
        designerId: design?.userId ?? null,
        commissionRate,
        commissionAmount,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = subtotal + SHIPPING_COST;

    const order = await this.orderModel.create({
      userId,
      items: orderItems,
      subtotal,
      shippingAddress: dto.shippingAddress,
      shippingCost: SHIPPING_COST,
      total,
      paymentStatus: 'pending',
    });

    let razorpayOrderId = `mock_${(order as any)._id}`;
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, currency: 'INR', receipt: (order as any)._id.toString() }),
        });
        const rzpData = (await rzpRes.json()) as { id?: string };
        if (rzpData.id) razorpayOrderId = rzpData.id;
      } catch (err: any) {
        this.logger.error(`Razorpay order creation failed: ${err.message}`);
      }
    }

    await this.orderModel.updateOne({ _id: (order as any)._id }, { paymentOrderId: razorpayOrderId });

    return {
      order,
      razorpayOrderId,
      amount: total,
      currency: 'INR',
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID', ''),
    };
  }

  async verifyPayment(orderId: string, userId: string, dto: VerifyPaymentDto): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'paid') throw new BadRequestException('Order already paid');

    const isMockOrder = order.paymentOrderId?.startsWith('mock_');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '');
    if (keySecret && !isMockOrder) {
      const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
      const expectedSignature = createHmac('sha256', keySecret).update(body).digest('hex');
      if (expectedSignature !== dto.razorpaySignature) {
        await this.orderModel.updateOne({ _id: orderId }, { paymentStatus: 'failed' });
        throw new BadRequestException('Payment verification failed');
      }
    }

    order.paymentStatus = 'paid';
    order.paymentId = dto.razorpayPaymentId;
    await order.save();

    this.postPaymentActions(order, userId).catch((err) =>
      this.logger.error(`Post-payment actions failed for order ${orderId}: ${err.message}`),
    );

    return order;
  }

  private async postPaymentActions(order: OrderDocument, buyerUserId: string): Promise<void> {
    const hasDesigns = order.items.some((item) => item.designId);

    if (hasDesigns && !order.aiCreditsBonusGranted) {
      await this.aiCreditsService.grant(
        buyerUserId,
        DESIGN_PURCHASE_BONUS_CREDITS,
        'design_purchase_bonus',
        (order as any)._id.toString(),
      );
      await this.orderModel.updateOne({ _id: (order as any)._id }, { aiCreditsBonusGranted: true });
    }

    for (const item of order.items) {
      if (item.designerId && item.commissionAmount > 0) {
        try {
          await this.creatorService.addEarnings(item.designerId, item.commissionAmount * item.quantity);
          const designId = item.designId?.toString();
          if (designId) {
            await this.designModel.findByIdAndUpdate(designId, { $inc: { salesCount: item.quantity } });
          }
        } catch (err: any) {
          this.logger.error(`Commission credit failed for designer ${item.designerId}: ${err.message}`);
        }
      }
    }

    await this.cartService.clearCart(buyerUserId);
  }

  async getMyOrders(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getOrderById(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateFulfillment(orderId: string, status: string, trackingNumber?: string): Promise<Order> {
    const update: Record<string, unknown> = { fulfillmentStatus: status };
    if (trackingNumber) update.trackingNumber = trackingNumber;
    const order = await this.orderModel.findByIdAndUpdate(orderId, update, { new: true });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
