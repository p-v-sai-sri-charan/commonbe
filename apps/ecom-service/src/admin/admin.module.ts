import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminConfig, AdminConfigSchema } from './schemas/admin-config.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { PayoutRequest, PayoutRequestSchema } from '../creator/schemas/payout-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminConfig.name, schema: AdminConfigSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PayoutRequest.name, schema: PayoutRequestSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
