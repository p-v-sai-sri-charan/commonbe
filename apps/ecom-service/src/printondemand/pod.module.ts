import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PodCatalogService } from './pod-catalog.service';
import { PodService } from './pod.service';
import { QikinkProvider } from './providers/qikink.provider';

@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  providers: [PodService, QikinkProvider, PodCatalogService],
  exports: [PodService, PodCatalogService],
})
export class PodModule {}
