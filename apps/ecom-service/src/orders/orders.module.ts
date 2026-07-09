import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiCreditsModule } from '../ai-credits/ai-credits.module';
import { CartModule } from '../cart/cart.module';
import { CreatorModule } from '../creator/creator.module';
import { Design, DesignSchema } from '../designs/schemas/design.schema';
import { PodModule } from '../printondemand/pod.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { NimbusModule } from '../shipping/nimbus.module';
import { OrdersController } from './orders.controller';
import { WebhooksController } from './webhooks.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Design.name, schema: DesignSchema },
    ]),
    CartModule,
    CreatorModule,
    AiCreditsModule,
    NimbusModule,
    PodModule,
  ],
  controllers: [OrdersController, WebhooksController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
