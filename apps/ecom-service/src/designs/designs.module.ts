import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { AdminConfig, AdminConfigSchema } from '../admin/schemas/admin-config.schema';
import { Design, DesignSchema } from './schemas/design.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Design.name, schema: DesignSchema },
      { name: AdminConfig.name, schema: AdminConfigSchema },
    ]),
  ],
  controllers: [DesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}
