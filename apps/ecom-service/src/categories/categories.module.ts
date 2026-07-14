import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ProductCategory, ProductCategorySchema } from './schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProductCategory.name, schema: ProductCategorySchema }]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
