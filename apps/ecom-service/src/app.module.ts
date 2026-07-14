import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from './admin/admin.module';
import { AiCreditsModule } from './ai-credits/ai-credits.module';
import { AiGenerationModule } from './ai-generation/ai-generation.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CreatorModule } from './creator/creator.module';
import { DesignsModule } from './designs/designs.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadsModule } from './uploads/uploads.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('ECOM_MONGO_URI', 'mongodb://localhost:27017/ecom_db'),
      }),
    }),
    ProductsModule,
    CategoriesModule,
    DesignsModule,
    MarketplaceModule,
    CreatorModule,
    AiCreditsModule,
    AiGenerationModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    ReportsModule,
    AdminModule,
    UploadsModule,
    EventsModule,
  ],
})
export class AppModule {}
