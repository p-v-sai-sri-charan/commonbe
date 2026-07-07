import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { DesignsModule } from './designs/designs.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StoreModule } from './store/store.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('TEMPTATTO_MONGO_URI', 'mongodb://localhost:27017/temptatto_db'),
      }),
    }),
    CategoriesModule,
    ProductsModule,
    DesignsModule,
    MarketplaceModule,
    StoreModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    ReportsModule,
    AdminModule,
    UploadsModule,
  ],
})
export class AppModule {}
