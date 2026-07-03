import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Design, DesignSchema } from '../designs/schemas/design.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { StoreProfile, StoreProfileSchema } from '../store/schemas/store-profile.schema';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Design.name, schema: DesignSchema },
      { name: StoreProfile.name, schema: StoreProfileSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
