import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { UpdateAdminConfigDto } from './dto/update-admin-config.dto';
import { AdminConfig, AdminConfigDocument } from './schemas/admin-config.schema';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectModel(AdminConfig.name) private readonly configModel: Model<AdminConfigDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async onModuleInit() {
    await this.configModel.findOneAndUpdate(
      { key: 'singleton' },
      { $setOnInsert: { key: 'singleton' } },
      { upsert: true },
    );
  }

  async getConfig(): Promise<AdminConfig> {
    return this.configModel.findOne({ key: 'singleton' }) as Promise<AdminConfig>;
  }

  async updateConfig(dto: UpdateAdminConfigDto): Promise<AdminConfig> {
    return this.configModel.findOneAndUpdate({ key: 'singleton' }, dto, { new: true }) as Promise<AdminConfig>;
  }

  async getAllOrders(page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> {
    const [orders, total] = await Promise.all([
      this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.orderModel.countDocuments(),
    ]);
    return { orders, total };
  }

  async updateOrderFulfillment(
    orderId: string,
    fulfillmentStatus: string,
    trackingNumber?: string,
  ): Promise<Order> {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { fulfillmentStatus, ...(trackingNumber && { trackingNumber }) },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
