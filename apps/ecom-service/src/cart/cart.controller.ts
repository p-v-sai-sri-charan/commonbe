import { Body, Controller, Delete, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';

@ApiTags('cart')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Headers('x-user-id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  upsertItem(@Headers('x-user-id') userId: string, @Body() dto: UpsertCartItemDto) {
    return this.cartService.upsertItem(userId, dto);
  }

  @Delete()
  clearCart(@Headers('x-user-id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
