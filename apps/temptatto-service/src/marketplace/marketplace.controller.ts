import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('designs')
  listDesigns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('sort') sort?: 'newest' | 'popular',
  ) {
    return this.marketplaceService.listDesigns({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 50),
      category,
      tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      sort: sort ?? 'newest',
    });
  }

  @Get('designs/:id')
  getDesignDetail(@Param('id') id: string) {
    return this.marketplaceService.getDesignDetail(id);
  }

  @Get('stores/:slug')
  getStorefront(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplaceService.getStorefront(slug, Number(page) || 1, Number(limit) || 20);
  }
}
