import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { FoodItem, FoodItemSchema } from './schemas/food-item.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FoodItem.name, schema: FoodItemSchema }])],
  controllers: [FoodsController],
  providers: [FoodsService],
  exports: [FoodsService],
})
export class FoodsModule {}
