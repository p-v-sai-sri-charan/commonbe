import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiCreditsModule } from '../ai-credits/ai-credits.module';
import { CreatorModule } from '../creator/creator.module';
import { AiGenerationController } from './ai-generation.controller';
import { AiGenerationService } from './ai-generation.service';
import { AiGeneration, AiGenerationSchema } from './schemas/ai-generation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AiGeneration.name, schema: AiGenerationSchema }]),
    AiCreditsModule,
    CreatorModule,
  ],
  controllers: [AiGenerationController],
  providers: [AiGenerationService],
  exports: [AiGenerationService],
})
export class AiGenerationModule {}
