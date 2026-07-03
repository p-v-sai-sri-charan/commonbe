import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';
import { Cart, CartDocument } from './schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>) {}

  async getCart(userId: string): Promise<Cart> {
    const cart = await this.cartModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, items: [] } },
      { upsert: true, new: true },
    );
    return cart;
  }

  async upsertItem(userId: string, dto: UpsertCartItemDto): Promise<Cart> {
    const cart = (await this.getCart(userId)) as CartDocument;
    const { productId, designId, size, placement, fulfillmentType, quantity } = dto;

    const existingIdx = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        (designId ? item.designId?.toString() === designId : !item.designId) &&
        item.size === size &&
        (placement ? item.placement === placement : !item.placement) &&
        item.fulfillmentType === fulfillmentType,
    );

    if (quantity === 0) {
      if (existingIdx !== -1) cart.items.splice(existingIdx, 1);
    } else if (existingIdx !== -1) {
      cart.items[existingIdx].quantity = quantity;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(productId),
        designId: designId ? new Types.ObjectId(designId) : null,
        size,
        placement: placement ?? null,
        fulfillmentType,
        quantity,
      });
    }

    return (cart as CartDocument).save();
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartModel.updateOne({ userId }, { items: [] });
  }
}
