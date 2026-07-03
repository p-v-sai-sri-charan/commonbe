import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * Ensures a "Blank Canvas" product exists — this is what "Create Design" opens
   * directly, so anyone can start designing without picking a product first.
   * Pricing here follows PRICING.md (A4 print cost ~₹400 baseline).
   */
  async onModuleInit() {
    const existing = await this.productModel.findOne({ isDefault: true });
    if (existing) return;

    const category = await this.categoriesService.getDefaultCategory();
    await this.productModel.create({
      name: 'Blank Canvas',
      description: 'Start from scratch — pick your own size and design anything you like.',
      categoryId: category._id,
      categorySlug: category.slug,
      // Derived from a ~₹400 A4 print cost at ~2.2x margin — see PRICING.md.
      basePrice: 150,
      sizeOptions: [
        { label: 'Small', widthCm: 10, heightCm: 10, priceModifier: 0 },
        { label: 'Medium', widthCm: 15, heightCm: 15, priceModifier: 150 },
        { label: 'A4', widthCm: 21, heightCm: 29.7, priceModifier: 700 },
      ],
      maxPrintAreaCm: { width: 21, height: 29.7 },
      placementSuggestions: ['Forearm', 'Wrist', 'Shoulder', 'Back', 'Ankle'],
      designAreaType: 'full',
      images: [],
      tags: ['custom', 'blank'],
      isActive: true,
      stockQuantity: null,
      isDefault: true,
    });
  }

  async findDefault(): Promise<ProductDocument> {
    const product = await this.productModel.findOne({ isDefault: true });
    if (!product) throw new NotFoundException('Default product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.categoriesService.findById(dto.categoryId);
    return this.productModel.create({ ...dto, categorySlug: category.slug });
  }

  async findAll(categorySlug?: string, activeOnly = true): Promise<Product[]> {
    const filter: Record<string, unknown> = {};
    if (activeOnly) filter.isActive = true;
    if (categorySlug) filter.categorySlug = categorySlug;
    return this.productModel.find(filter).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const update: Record<string, unknown> = { ...dto };
    if (dto.categoryId) {
      const category = await this.categoriesService.findById(dto.categoryId);
      update.categorySlug = category.slug;
    }
    const product = await this.productModel.findByIdAndUpdate(id, update, { new: true });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Product not found');
  }

  async toggleDesignAreaType(
    id: string,
    type: 'full' | 'limited',
    designArea?: { x: number; y: number; width: number; height: number },
  ): Promise<Product> {
    const update: Record<string, unknown> = { designAreaType: type };
    if (type === 'limited' && designArea) update.designArea = designArea;
    if (type === 'full') update.designArea = null;

    const product = await this.productModel.findByIdAndUpdate(id, update, { new: true });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
