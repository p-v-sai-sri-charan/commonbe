import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>) {}

  async create(dto: CreateProductDto): Promise<Product> {
    return this.productModel.create(dto);
  }

  async findAll(category?: string, activeOnly = true): Promise<Product[]> {
    const filter: Record<string, unknown> = {};
    if (activeOnly) filter.isActive = true;
    if (category) filter.category = category;
    return this.productModel.find(filter).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(id, dto, { new: true });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Product not found');
  }

  async toggleDesignAreaType(id: string, type: 'full' | 'limited', designArea?: { x: number; y: number; width: number; height: number }): Promise<Product> {
    const update: Record<string, unknown> = { designAreaType: type };
    if (type === 'limited' && designArea) update.designArea = designArea;
    if (type === 'full') update.designArea = null;

    const product = await this.productModel.findByIdAndUpdate(id, update, { new: true });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
