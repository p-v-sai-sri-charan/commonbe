import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { Design, DesignSchema } from './schemas/design.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Design.name, schema: DesignSchema }])],
  controllers: [DesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}
