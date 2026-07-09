import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminConfig, AdminConfigSchema } from '../admin/schemas/admin-config.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creator/schemas/creator-profile.schema';
import { Design, DesignSchema } from '../designs/schemas/design.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Design.name, schema: DesignSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: Product.name, schema: ProductSchema },
      { name: AdminConfig.name, schema: AdminConfigSchema },
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
