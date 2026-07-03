import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

export const DEFAULT_CATEGORY_SLUG = 'custom';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>) {}

  /** Ensures a "Custom Designs" category exists to hold the blank-canvas default product. */
  async onModuleInit() {
    await this.categoryModel.findOneAndUpdate(
      { slug: DEFAULT_CATEGORY_SLUG },
      {
        $setOnInsert: {
          slug: DEFAULT_CATEGORY_SLUG,
          name: 'Custom Designs',
          description: 'Start from a blank canvas and design anything.',
          isActive: true,
          sortOrder: -1,
        },
      },
      { upsert: true },
    );
  }

  async getDefaultCategory(): Promise<CategoryDocument> {
    return this.findBySlug(DEFAULT_CATEGORY_SLUG);
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryModel.findOne({ slug: dto.slug });
    if (existing) throw new ConflictException('Category slug already exists');
    return this.categoryModel.create(dto);
  }

  async findAllPublic(): Promise<Category[]> {
    return this.categoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  }

  async findAllAdmin(): Promise<Category[]> {
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 });
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ slug });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    if (dto.slug) {
      const existing = await this.categoryModel.findOne({ slug: dto.slug, _id: { $ne: id } });
      if (existing) throw new ConflictException('Category slug already exists');
    }
    const category = await this.categoryModel.findByIdAndUpdate(id, dto, { new: true });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Category not found');
  }
}
