import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BiologicalSex } from '../../common/enums';

export type EducationArticleDocument = EducationArticle & Document;

@Schema({ collection: 'epidiet_education_articles' })
export class EducationArticle {
  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Only shown when this matches the user's profile.biologicalSex, if set. */
  @Prop({ type: String, enum: BiologicalSex })
  genderRelevance?: BiologicalSex;
}

export const EducationArticleSchema = SchemaFactory.createForClass(EducationArticle);
