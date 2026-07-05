import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { createHmac } from 'crypto';
import { Model, Types } from 'mongoose';
import { CartService } from '../cart/cart.service';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { StoreService } from '../store/store.service';
import { NimbusService } from '../shipping/nimbus.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Order, OrderDocument } from './schemas/order.schema';

// Production lead time before handing to courier
const PRODUCTION_DAYS = 1;
// Estimated transit days (conservative mid-range for all-India)
const TRANSIT_DAYS = 5;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    private readonly cartService: CartService,
    private readonly storeService: StoreService,
    private readonly configService: ConfigService,
    private readonly nimbusService: NimbusService,
    @Inject('EVENTS_SERVICE') private readonly eventsClient: ClientProxy,
  ) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<{ order: Order; razorpayOrderId: string; amount: number; currency: string; keyId: string }> {
    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const productIds = [...new Set(cart.items.map((i) => i.productId.toString()))];
    const designIds = cart.items.filter((i) => i.designId).map((i) => i.designId!.toString());

    const [products, designs] = await Promise.all([
      this.productModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } }),
      this.designModel.find({ _id: { $in: designIds.map((id) => new Types.ObjectId(id)) } }),
    ]);

    const productMap = new Map(products.map((p) => [(p as unknown as { _id: Types.ObjectId })._id.toString(), p]));
    const designMap = new Map(designs.map((d) => [(d as unknown as { _id: Types.ObjectId })._id.toString(), d]));

    let hasPhysicalItem = false;

    const orderItems = cart.items.map((cartItem) => {
      const product = productMap.get(cartItem.productId.toString());
      if (!product) throw new BadRequestException(`Product ${cartItem.productId} not found`);

      const design = cartItem.designId ? designMap.get(cartItem.designId.toString()) : null;

      let unitPrice: number;
      if (cartItem.fulfillmentType === 'digital') {
        if (!design || !design.allowDigitalDownload || design.digitalPrice == null) {
          throw new BadRequestException('This design is not available as a digital download');
        }
        unitPrice = design.digitalPrice;
      } else {
        hasPhysicalItem = true;
        const sizeOption = product.sizeOptions.find((s) => s.label === cartItem.size);
        const sizeModifier = sizeOption?.priceModifier ?? 0;
        unitPrice = product.basePrice + sizeModifier + (design?.physicalPrice ?? 0);
      }

      const commissionRate = design?.commissionRate ?? 0;
      const commissionAmount = design ? Math.round((unitPrice * commissionRate) / 100) : 0;

      return {
        productId: cartItem.productId,
        designId: cartItem.designId ?? null,
        size: cartItem.size,
        placement: cartItem.placement,
        fulfillmentType: cartItem.fulfillmentType,
        quantity: cartItem.quantity,
        unitPrice,
        designerId: design?.userId ?? null,
        commissionRate,
        commissionAmount,
        digitalDownloadUrl: null,
      };
    });

    if (hasPhysicalItem && !dto.shippingAddress) {
      throw new BadRequestException('shippingAddress is required when the cart contains a physical item');
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = subtotal; // shipping is free

    const order = await this.orderModel.create({
      userId,
      items: orderItems,
      subtotal,
      shippingAddress: dto.shippingAddress ?? null,
      shippingCost: 0,
      total,
      paymentStatus: 'pending',
      customerEmail: dto.customerEmail ?? null,
    });

    let razorpayOrderId = `mock_${(order as unknown as { _id: Types.ObjectId })._id}`;
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total * 100, currency: 'INR', receipt: order.id }),
        });
        const rzpData = (await rzpRes.json()) as { id?: string };
        if (rzpData.id) razorpayOrderId = rzpData.id;
      } catch (err: any) {
        this.logger.error(`Razorpay order creation failed: ${err.message}`);
      }
    }

    await this.orderModel.updateOne({ _id: order.id }, { paymentOrderId: razorpayOrderId });

    return {
      order,
      razorpayOrderId,
      amount: total * 100,
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
    let allDigital = true;

    for (const item of order.items) {
      if (item.fulfillmentType !== 'digital') allDigital = false;

      if (item.designerId && item.commissionAmount > 0) {
        try {
          await this.storeService.addEarnings(item.designerId, item.commissionAmount * item.quantity);
        } catch (err: any) {
          this.logger.error(`Commission credit failed for designer ${item.designerId}: ${err.message}`);
        }
      }

      const designId = item.designId?.toString();
      if (designId) {
        try {
          await this.designModel.findByIdAndUpdate(designId, { $inc: { salesCount: item.quantity } });
          if (item.fulfillmentType === 'digital') {
            const design = await this.designModel.findById(designId);
            if (design?.printReadyUrl) item.digitalDownloadUrl = design.printReadyUrl;
          }
        } catch (err: any) {
          this.logger.error(`Sales count/digital link update failed for design ${designId}: ${err.message}`);
        }
      }
    }

    if (allDigital) {
      order.fulfillmentStatus = 'delivered';
      await order.save();
      await this.cartService.clearCart(buyerUserId);
      this.publishOrderPaidEvent(order);
      return;
    }

    // Physical order — create NimbusPost shipment
    order.fulfillmentStatus = 'processing';
    order.estimatedDelivery = this.computeEstimatedDelivery();
    await order.save();

    if (order.shippingAddress) {
      const physicalItems = order.items
        .filter((i) => i.fulfillmentType === 'physical')
        .map((i) => ({ name: 'Temporary Tattoo', quantity: i.quantity, unitPrice: i.unitPrice }));

      try {
        const shipment = await this.nimbusService.createShipment({
          orderId: (order as unknown as { _id: { toString(): string } })._id.toString(),
          shippingAddress: order.shippingAddress,
          items: physicalItems,
          invoiceValue: order.total,
        });

        if (shipment) {
          order.awbNumber = shipment.awbNumber;
          order.courierId = shipment.courierId;
          order.courierName = shipment.courierName;
          order.nimbusShipmentId = shipment.shipmentId;
          order.trackingNumber = shipment.awbNumber;
          order.labelUrl = shipment.labelUrl;
          await order.save();
          this.logger.log(`NimbusPost shipment created: AWB ${shipment.awbNumber} for order ${order._id}`);
        }
      } catch (err: any) {
        this.logger.error(`NimbusPost shipment failed for order ${order._id}: ${err.message}`);
      }
    }

    await this.cartService.clearCart(buyerUserId);
    this.publishOrderPaidEvent(order);
  }

  private computeEstimatedDelivery(): Date {
    const date = new Date();
    date.setDate(date.getDate() + PRODUCTION_DAYS + TRANSIT_DAYS);
    return date;
  }

  private publishOrderPaidEvent(order: OrderDocument): void {
    try {
      const payload = {
        orderId: (order as unknown as { _id: { toString(): string } })._id.toString(),
        customerEmail: order.customerEmail,
        customerName: order.shippingAddress?.name ?? null,
        customerPhone: order.shippingAddress?.phone ?? null,
        awbNumber: order.awbNumber ?? null,
        courierName: order.courierName ?? null,
        estimatedDelivery: order.estimatedDelivery?.toISOString() ?? null,
        total: order.total,
        shippingAddress: order.shippingAddress ?? null,
        items: order.items.map((i) => ({
          size: i.size,
          fulfillmentType: i.fulfillmentType,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        occurredAt: new Date().toISOString(),
      };
      this.eventsClient.emit('temptatto.order.paid', payload).subscribe({
        error: (err) => this.logger.warn(`Failed to publish temptatto.order.paid: ${err?.message}`),
      });
    } catch (err: any) {
      this.logger.warn(`Failed to publish temptatto.order.paid: ${err.message}`);
    }
  }

  async getDeliveryEstimate(destinationPincode: string): Promise<{ estimatedDelivery: string }> {
    const warehousePincode = this.configService.get<string>('NIMBUSPOST_WAREHOUSE_PINCODE', '');

    if (warehousePincode && destinationPincode.length === 6) {
      // Fire-and-forget serviceability check — we use fixed days regardless
      this.nimbusService
        .checkServiceability(warehousePincode, destinationPincode)
        .catch((err) => this.logger.warn(`Serviceability pre-check failed: ${err.message}`));
    }

    const estimated = this.computeEstimatedDelivery();
    return { estimatedDelivery: estimated.toISOString() };
  }

  async getMyOrders(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getOrderById(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
