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
import { PodOrderInput } from '../printondemand/pod-provider.interface';
import { PodService } from '../printondemand/pod.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { NimbusService } from '../shipping/nimbus.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Order, OrderDocument } from './schemas/order.schema';

const SHIPPING_COST = 0;
const DESIGN_PURCHASE_BONUS_CREDITS = 20;
/** Print-on-demand: days to print + typical courier transit across India. */
const PRODUCTION_DAYS = 3;
const TRANSIT_DAYS = 5;

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
    private readonly nimbusService: NimbusService,
    private readonly podService: PodService,
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

      // Stock check: the variant/size must exist and cover the requested quantity.
      // Actual decrement happens after payment succeeds (postPaymentActions).
      const variant = product.variants.find(
        (v) => v.color.toLowerCase() === cartItem.variantColor.toLowerCase(),
      );
      const sizeStock = variant?.sizes.find((s) => s.size === cartItem.size);
      if (!variant || !sizeStock) {
        throw new BadRequestException(
          `${product.name} is not available in ${cartItem.variantColor} / ${cartItem.size}`,
        );
      }
      if (sizeStock.stock < cartItem.quantity) {
        throw new BadRequestException(
          `Only ${sizeStock.stock} left of ${product.name} (${cartItem.variantColor} / ${cartItem.size}) — reduce the quantity`,
        );
      }

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
      customerEmail: dto.customerEmail ?? null,
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
      // Decrement variant/size stock. Atomic $inc with arrayFilters; floor guard at
      // the query level so a concurrent sell-out can't push stock below zero.
      try {
        await this.productModel.updateOne(
          { _id: item.productId },
          { $inc: { 'variants.$[v].sizes.$[s].stock': -item.quantity } },
          {
            arrayFilters: [
              { 'v.color': item.variantColor },
              { 's.size': item.size, 's.stock': { $gte: item.quantity } },
            ],
          },
        );
      } catch (err: any) {
        this.logger.error(`Stock decrement failed for product ${item.productId}: ${err.message}`);
      }

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

    // Shipment/POD creation is deferred to admin categorization (setOrderCategory):
    // inhouse/custom → NimbusPost shipment, print_on_demand → Qikink order.
    order.fulfillmentStatus = 'processing';
    order.estimatedDelivery = this.computeEstimatedDelivery();
    await order.save();

    await this.cartService.clearCart(buyerUserId);
  }

  /** NimbusPost shipment for in-house fulfilled orders (no-op when NIMBUSPOST_* env unset). */
  private async createNimbusShipment(order: OrderDocument): Promise<void> {
    try {
      const shipment = await this.nimbusService.createShipment({
        orderId: (order as any)._id.toString(),
        shippingAddress: order.shippingAddress,
        items: order.items.map((i) => ({
          name: `Custom T-Shirt (${i.variantColor}/${i.size})`,
          quantity: i.quantity,
          unitPrice: Math.round(i.unitPrice / 100),
        })),
        invoiceValue: Math.round(order.total / 100),
      });

      if (shipment) {
        order.awbNumber = shipment.awbNumber;
        order.courierId = shipment.courierId;
        order.courierName = shipment.courierName;
        order.nimbusShipmentId = shipment.shipmentId;
        order.trackingNumber = shipment.awbNumber;
        order.labelUrl = shipment.labelUrl;
        this.logger.log(`NimbusPost shipment created: AWB ${shipment.awbNumber} for order ${(order as any)._id}`);
      }
    } catch (err: any) {
      this.logger.error(`NimbusPost shipment failed for order ${(order as any)._id}: ${err.message}`);
    }
  }

  /**
   * Admin categorization — the fulfillment decision point. inhouse/custom get a
   * NimbusPost shipment (if none yet); print_on_demand creates the provider order
   * (Qikink) which then handles printing AND shipping. POD creation is atomic-ish:
   * if the provider rejects the order, nothing is saved and the admin sees the error.
   */
  async setOrderCategory(
    orderId: string,
    orderType: 'inhouse' | 'custom' | 'print_on_demand',
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException(`Only paid orders can be categorized (this one is '${order.paymentStatus}')`);
    }

    if (orderType === 'print_on_demand') {
      if (order.podOrderId) {
        throw new BadRequestException(`A ${order.podProvider} order already exists for this order (${order.podOrderId})`);
      }
      const input = await this.buildPodOrderInput(order);
      const result = await this.podService.createOrder('qikink', input);
      order.podProvider = 'qikink';
      order.podOrderId = result.podOrderId;
      order.podStatus = 'created';

      // A shipment from an earlier inhouse/custom categorization is now redundant.
      if (order.awbNumber) {
        const cancelled = await this.nimbusService.cancelShipment(order.awbNumber);
        if (!cancelled) {
          this.logger.warn(`NimbusPost cancel failed for AWB ${order.awbNumber} — cancel manually`);
        }
        order.awbNumber = null;
        order.courierId = null;
        order.courierName = null;
        order.nimbusShipmentId = null;
        order.trackingNumber = null;
        order.labelUrl = null;
      }
    } else if (!order.awbNumber) {
      await this.createNimbusShipment(order);
    }

    order.orderType = orderType;
    return order.save();
  }

  /** Pull provider-side status (and AWB/tracking once shipped) for a POD order. */
  async syncPodStatus(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (!order.podProvider || !order.podOrderId) {
      throw new BadRequestException('This order has no print-on-demand order to sync');
    }

    const status = await this.podService.getOrderStatus(order.podProvider, order.podOrderId);
    if (!status) throw new BadRequestException(`Could not fetch order ${order.podOrderId} from ${order.podProvider}`);

    if (status.status) order.podStatus = status.status;
    if (status.awb) order.trackingNumber = status.awb;
    if (status.trackingLink) order.podTrackingLink = status.trackingLink;
    return order.save();
  }

  /**
   * Maps a ustyld order to a provider order. Every item must resolve to a
   * provider SKU (product.pod.baseSku + variant.podColorCode + size) and carry a
   * design with a rendered thumbnail — design-less items can't be printed on demand.
   */
  private async buildPodOrderInput(order: OrderDocument): Promise<PodOrderInput> {
    const productIds = [...new Set(order.items.map((i) => i.productId.toString()))];
    const designIds = order.items.filter((i) => i.designId).map((i) => i.designId!.toString());

    const [products, designs] = await Promise.all([
      this.productModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } }),
      this.designModel.find({ _id: { $in: designIds.map((id) => new Types.ObjectId(id)) } }),
    ]);
    const productMap = new Map(products.map((p) => [(p as any)._id.toString(), p]));
    const designMap = new Map(designs.map((d) => [(d as any)._id.toString(), d]));

    const lineItems = order.items.map((item) => {
      const product = productMap.get(item.productId.toString());
      if (!product) throw new BadRequestException(`Product ${item.productId} no longer exists`);
      if (!product.pod?.baseSku || !product.pod?.printTypeId) {
        throw new BadRequestException(`'${product.name}' has no print-on-demand mapping — set pod.baseSku/printTypeId on the product`);
      }
      const variant = product.variants.find(
        (v) => v.color.toLowerCase() === item.variantColor.toLowerCase(),
      );
      if (!variant?.podColorCode) {
        throw new BadRequestException(`'${product.name}' variant '${item.variantColor}' has no podColorCode — set it on the product`);
      }
      const designId = item.designId?.toString();
      const design = designId ? designMap.get(designId) : null;
      if (!design?.thumbnailUrl) {
        throw new BadRequestException(
          `Order item '${product.name}' (${item.variantColor}/${item.size}) has no design thumbnail — print-on-demand needs a rendered design image`,
        );
      }

      return {
        sku: `${product.pod.baseSku}-${variant.podColorCode}-${item.size}`,
        quantity: item.quantity,
        priceRupees: Math.round(item.unitPrice / 100), // ecom stores paise
        printTypeId: product.pod.printTypeId,
        designCode: designId!, // stable per design → Qikink reuses it on repeat orders
        designUrl: design.thumbnailUrl,
        mockupUrl: design.thumbnailUrl,
      };
    });

    const [firstName, ...rest] = order.shippingAddress.name.trim().split(/\s+/);
    return {
      orderNumber: (order as any)._id.toString(),
      totalValueRupees: Math.round(order.total / 100),
      lineItems,
      shippingAddress: {
        firstName,
        lastName: rest.join(' '),
        address1: order.shippingAddress.line1,
        address2: order.shippingAddress.line2 ?? '',
        phone: order.shippingAddress.phone.replace(/\D/g, '').slice(-10),
        email: order.customerEmail ?? '',
        city: order.shippingAddress.city,
        zip: order.shippingAddress.pincode,
        province: order.shippingAddress.state,
        countryCode: 'IN',
      },
    };
  }

  private computeEstimatedDelivery(): Date {
    const date = new Date();
    date.setDate(date.getDate() + PRODUCTION_DAYS + TRANSIT_DAYS);
    return date;
  }

  async getDeliveryEstimate(destinationPincode: string): Promise<{ estimatedDelivery: string }> {
    const warehousePincode = this.configService.get<string>('NIMBUSPOST_WAREHOUSE_PINCODE', '');

    if (warehousePincode && destinationPincode.length === 6) {
      // Fire-and-forget serviceability check — we use fixed days regardless
      this.nimbusService
        .checkServiceability(warehousePincode, destinationPincode)
        .catch((err) => this.logger.warn(`Serviceability pre-check failed: ${err.message}`));
    }

    return { estimatedDelivery: this.computeEstimatedDelivery().toISOString() };
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

  /**
   * Admin-only refund: marks the order refunded/cancelled, restores variant
   * stock, and cancels the NimbusPost shipment if one was created. The actual
   * money movement happens in the Razorpay dashboard — this records the outcome.
   */
  async adminRefund(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException(`Only paid orders can be refunded (this one is '${order.paymentStatus}')`);
    }
    if (order.fulfillmentStatus === 'delivered') {
      throw new BadRequestException('Delivered orders cannot be refunded from here — handle via support');
    }

    for (const item of order.items) {
      try {
        await this.productModel.updateOne(
          { _id: item.productId },
          { $inc: { 'variants.$[v].sizes.$[s].stock': item.quantity } },
          {
            arrayFilters: [{ 'v.color': item.variantColor }, { 's.size': item.size }],
          },
        );
      } catch (err: any) {
        this.logger.error(`Stock restore failed for product ${item.productId}: ${err.message}`);
      }
    }

    if (order.awbNumber) {
      const cancelled = await this.nimbusService.cancelShipment(order.awbNumber);
      if (!cancelled) {
        this.logger.warn(`NimbusPost cancel failed for AWB ${order.awbNumber} — cancel manually in the dashboard`);
      }
    }

    // Qikink's API has no cancel endpoint — the POD order must be cancelled in their dashboard.
    if (order.podOrderId) {
      this.logger.warn(
        `Order ${orderId} refunded but has ${order.podProvider} order ${order.podOrderId} — cancel it manually in the provider dashboard`,
      );
    }

    order.paymentStatus = 'refunded';
    order.fulfillmentStatus = 'cancelled';
    return order.save();
  }
}
