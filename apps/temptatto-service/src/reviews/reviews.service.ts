import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Verified-purchase gate: the order must belong to the reviewer, be paid,
   * and actually contain the design being reviewed.
   */
  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const design = await this.designModel.findById(dto.designId);
    if (!design) throw new NotFoundException('Design not found');

    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(dto.orderId),
      userId,
      paymentStatus: 'paid',
      'items.designId': new Types.ObjectId(dto.designId),
    });
    if (!order) {
      throw new ForbiddenException('You can only review designs from your own paid orders');
    }

    // Upsert so a buyer can revise their review instead of hitting the unique index.
    const review = await this.reviewModel.findOneAndUpdate(
      { userId, designId: new Types.ObjectId(dto.designId) },
      {
        userId,
        designId: new Types.ObjectId(dto.designId),
        orderId: new Types.ObjectId(dto.orderId),
        rating: dto.rating,
        comment: dto.comment ?? null,
        photoUrls: dto.photoUrls ?? [],
        reviewerName: dto.reviewerName ?? null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await this.recomputeDesignRating(dto.designId);
    return review;
  }

  async listByDesign(
    designId: string,
    page = 1,
    limit = 20,
  ): Promise<{ reviews: Review[]; total: number; ratingAvg: number; ratingCount: number }> {
    if (!Types.ObjectId.isValid(designId)) throw new BadRequestException('Invalid design id');
    const filter = { designId: new Types.ObjectId(designId) };
    const [reviews, total, design] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reviewModel.countDocuments(filter),
      this.designModel.findById(designId),
    ]);
    return {
      reviews,
      total,
      ratingAvg: design?.ratingAvg ?? 0,
      ratingCount: design?.ratingCount ?? 0,
    };
  }

  async listMine(userId: string): Promise<Review[]> {
    return this.reviewModel.find({ userId }).sort({ createdAt: -1 });
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findById(id);
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Not your review');
    await this.reviewModel.findByIdAndDelete(id);
    await this.recomputeDesignRating(review.designId.toString());
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  async adminList(page = 1, limit = 20): Promise<{ reviews: Review[]; total: number }> {
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reviewModel.countDocuments(),
    ]);
    return { reviews, total };
  }

  async adminRemove(id: string): Promise<void> {
    const review = await this.reviewModel.findByIdAndDelete(id);
    if (!review) throw new NotFoundException('Review not found');
    await this.recomputeDesignRating(review.designId.toString());
  }

  private async recomputeDesignRating(designId: string): Promise<void> {
    const [agg] = await this.reviewModel.aggregate<{ avg: number; count: number }>([
      { $match: { designId: new Types.ObjectId(designId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await this.designModel.findByIdAndUpdate(designId, {
      ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
      ratingCount: agg?.count ?? 0,
    });
  }
}
