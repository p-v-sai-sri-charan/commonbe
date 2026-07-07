import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { DesignsModule } from '../designs/designs.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { ReportsModule } from '../reports/reports.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminConfig, AdminConfigSchema } from './schemas/admin-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminConfig.name, schema: AdminConfigSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    CategoriesModule,
    ReviewsModule,
    ReportsModule,
    DesignsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
