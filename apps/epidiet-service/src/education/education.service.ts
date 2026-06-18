import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BiologicalSex } from '../common/enums';
import { EDUCATION_ARTICLES_SEED } from './data/education-articles.seed';
import { EducationArticle, EducationArticleDocument } from './schemas/education-article.schema';

@Injectable()
export class EducationService implements OnModuleInit {
  private readonly logger = new Logger(EducationService.name);

  constructor(
    @InjectModel(EducationArticle.name) private readonly articleModel: Model<EducationArticleDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.articleModel.estimatedDocumentCount();
    if (count > 0) return;

    await this.articleModel.insertMany(EDUCATION_ARTICLES_SEED);
    this.logger.log(`Seeded ${EDUCATION_ARTICLES_SEED.length} education articles`);
  }

  async list(tag?: string, gender?: BiologicalSex): Promise<EducationArticle[]> {
    const filter: Record<string, unknown> = {};
    if (tag) filter.tags = tag;
    if (gender) filter.$or = [{ genderRelevance: gender }, { genderRelevance: { $exists: false } }];
    return this.articleModel.find(filter);
  }

  async findBySlug(slug: string): Promise<EducationArticle> {
    const article = await this.articleModel.findOne({ slug });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }
}
