import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QIKINK_APPAREL_CATALOG } from '../printondemand/data/qikink-apparel-catalog';
import { ProductCategory, ProductCategoryDocument } from './schemas/category.schema';

/** Friendly labels for Qikink's garmentType keys — mirrors the studio's GARMENT_META. */
const QIKINK_GARMENT_LABELS: Record<string, string> = {
  tshirt: 'T-Shirt',
  polo: 'Polo',
  hoodie: 'Hoodie',
  sweatshirt: 'Sweatshirt',
  tank: 'Tank Top',
  crop_top: 'Crop Top',
  dress: 'Dress',
  skirt: 'Skirt',
  shorts: 'Shorts',
  joggers: 'Joggers',
  jacket: 'Jacket',
  romper: 'Romper',
  kaftan: 'Kaftan',
  shirt: 'Shirt',
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(ProductCategory.name)
    private readonly categoryModel: Model<ProductCategoryDocument>,
  ) {}

  async list(): Promise<ProductCategory[]> {
    return this.categoryModel.find().sort({ name: 1 });
  }

  async create(name: string): Promise<ProductCategory> {
    const slug = slugify(name);
    if (!slug) throw new BadRequestException('Category name must contain letters or numbers');

    const existing = await this.categoryModel.findOne({ slug });
    if (existing) throw new BadRequestException(`Category "${existing.name}" already exists`);

    return this.categoryModel.create({ name: name.trim(), slug });
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.categoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Category not found');
    // Products already tagged with this category's slug keep it as a plain string —
    // there's no foreign key here, so nothing else needs to change.
  }

  /** Adds any of Qikink's garment types not already present as a category. */
  async seedFromQikink(): Promise<{ added: string[]; skipped: string[] }> {
    const distinctTypes = [...new Set(QIKINK_APPAREL_CATALOG.map((s) => s.garmentType))];
    const existing = await this.categoryModel.find({ slug: { $in: distinctTypes } }).select('slug');
    const existingSlugs = new Set(existing.map((c) => c.slug));

    const added: string[] = [];
    const skipped: string[] = [];
    for (const slug of distinctTypes) {
      if (existingSlugs.has(slug)) {
        skipped.push(slug);
        continue;
      }
      const name = QIKINK_GARMENT_LABELS[slug] ?? slug;
      await this.categoryModel.create({ name, slug });
      added.push(name);
    }
    return { added, skipped };
  }
}
