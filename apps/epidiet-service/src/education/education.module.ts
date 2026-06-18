import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EducationController } from './education.controller';
import { EducationService } from './education.service';
import { EducationArticle, EducationArticleSchema } from './schemas/education-article.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: EducationArticle.name, schema: EducationArticleSchema }])],
  controllers: [EducationController],
  providers: [EducationService],
})
export class EducationModule {}
