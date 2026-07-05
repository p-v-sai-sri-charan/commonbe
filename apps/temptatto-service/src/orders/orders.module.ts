import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { CartModule } from '../cart/cart.module';
import { Design, DesignSchema } from '../designs/schemas/design.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { NimbusModule } from '../shipping/nimbus.module';
import { StoreModule } from '../store/store.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Design.name, schema: DesignSchema },
    ]),
    // RabbitMQ producer — publishes temptatto.order.paid to the shared events queue
    ClientsModule.registerAsync([
      {
        name: 'EVENTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: configService.get<string>('RABBITMQ_EVENTS_QUEUE', 'auth_events_queue'),
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
    CartModule,
    StoreModule,
    NimbusModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
