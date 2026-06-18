import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('sign')
  getSignature(@Query('folder') folder?: string) {
    return this.uploadsService.getCloudinarySignature(folder ?? 'ecom-designs');
  }
}
