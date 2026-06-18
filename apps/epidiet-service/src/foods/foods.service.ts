import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FoodEpigeneticTag } from '../common/enums';
import { FOOD_ITEMS_SEED } from './data/food-items.seed';
import { FoodItem, FoodItemDocument } from './schemas/food-item.schema';

@Injectable()
export class FoodsService implements OnModuleInit {
  private readonly logger = new Logger(FoodsService.name);

  constructor(@InjectModel(FoodItem.name) private readonly foodItemModel: Model<FoodItemDocument>) {}

  /** Seeds the curated food catalog once, on first boot against an empty collection. */
  async onModuleInit() {
    const count = await this.foodItemModel.estimatedDocumentCount();
    if (count > 0) return;

    await this.foodItemModel.insertMany(FOOD_ITEMS_SEED);
    this.logger.log(`Seeded ${FOOD_ITEMS_SEED.length} food items`);
  }

  async search(tags?: FoodEpigeneticTag[]): Promise<FoodItem[]> {
    const filter = tags?.length ? { epigeneticTags: { $in: tags } } : {};
    return this.foodItemModel.find(filter);
  }

  async findById(id: string): Promise<FoodItem> {
    const food = await this.foodItemModel.findById(id);
    if (!food) {
      throw new NotFoundException('Food item not found');
    }
    return food;
  }

  async findByTags(tags: FoodEpigeneticTag[], limit = 10): Promise<FoodItemDocument[]> {
    return this.foodItemModel.find({ epigeneticTags: { $in: tags } }).limit(limit);
  }
}
