import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AiService } from '@app/ai';
import { Model } from 'mongoose';
import { AssessmentService } from '../assessment/assessment.service';
import { BiologicalSex, EpigeneticPathway, FoodEpigeneticTag } from '../common/enums';
import { FoodsService } from '../foods/foods.service';
import { ProfileService } from '../profile/profile.service';
import { GenerateMealPlanDto } from './dto/generate-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';
import { MealPlan, MealPlanDocument } from './schemas/meal-plan.schema';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

/** Lowest score = highest priority pathway to address with food choices. */
const PATHWAY_TO_TAGS: Record<EpigeneticPathway, FoodEpigeneticTag[]> = {
  [EpigeneticPathway.METHYLATION]: [FoodEpigeneticTag.METHYL_DONOR],
  [EpigeneticPathway.HISTONE_MODIFICATION]: [FoodEpigeneticTag.HDAC_INHIBITOR],
  [EpigeneticPathway.OXIDATIVE_STRESS]: [FoodEpigeneticTag.ANTI_INFLAMMATORY, FoodEpigeneticTag.SIRTUIN_ACTIVATOR],
  [EpigeneticPathway.GUT_MICROBIOME]: [FoodEpigeneticTag.HDAC_INHIBITOR],
};

@Injectable()
export class MealPlansService {
  private readonly logger = new Logger(MealPlansService.name);

  constructor(
    @InjectModel(MealPlan.name) private readonly mealPlanModel: Model<MealPlanDocument>,
    private readonly assessmentService: AssessmentService,
    private readonly foodsService: FoodsService,
    private readonly profileService: ProfileService,
    private readonly aiService: AiService,
  ) {}

  private defaultWeekStart(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(isoDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  /** Picks the priority tags: lowest-scoring pathways first, plus gender protocol if known. */
  private async pickPriorityTags(authUserId: string): Promise<FoodEpigeneticTag[]> {
    const scores = await this.assessmentService.computeScores(authUserId);
    const pathwaysByScore = Object.values(EpigeneticPathway).sort((a, b) => scores[a] - scores[b]);
    const tags = new Set<FoodEpigeneticTag>();

    for (const pathway of pathwaysByScore.slice(0, 2)) {
      PATHWAY_TO_TAGS[pathway].forEach((tag) => tags.add(tag));
    }

    const profile = await this.profileService.findProfileOrNull(authUserId);
    if (profile?.biologicalSex === BiologicalSex.FEMALE) tags.add(FoodEpigeneticTag.FEMALE_PROTOCOL);
    if (profile?.biologicalSex === BiologicalSex.MALE) tags.add(FoodEpigeneticTag.MALE_PROTOCOL);

    return Array.from(tags);
  }

  private async buildRationale(authUserId: string, tags: FoodEpigeneticTag[]): Promise<string | undefined> {
    if (!this.aiService.isConfigured()) return undefined;

    try {
      const reply = await this.aiService.generateReply([
        {
          role: 'system',
          content:
            'You are EpiDiet\'s nutrition coach. Explain, in 2-3 sentences and plain language, why a weekly meal plan built around these epigenetic food categories supports the user\'s gene expression. Be encouraging, not medical-advice-sounding.',
        },
        { role: 'user', content: `Priority food categories for this week: ${tags.join(', ')}` },
      ]);
      return reply.content;
    } catch (error) {
      this.logger.warn(`AI rationale generation failed, continuing without it: ${(error as Error).message}`);
      return undefined;
    }
  }

  async generate(authUserId: string, dto: GenerateMealPlanDto): Promise<MealPlan> {
    const weekStartDate = dto.weekStartDate ?? this.defaultWeekStart();
    const priorityTags = await this.pickPriorityTags(authUserId);
    const candidateFoods = await this.foodsService.findByTags(priorityTags, 21);

    if (candidateFoods.length === 0) {
      throw new NotFoundException('No matching foods found for meal plan generation — try seeding the food catalog');
    }

    let foodIndex = 0;
    const nextFoodId = () => candidateFoods[foodIndex++ % candidateFoods.length]._id.toString();

    const days = Array.from({ length: 7 }, (_, dayOffset) => ({
      date: this.addDays(weekStartDate, dayOffset),
      meals: MEAL_TYPES.map((mealType) => ({
        mealType,
        foodItemIds: [nextFoodId(), nextFoodId()],
      })),
    }));

    const scores = await this.assessmentService.computeScores(authUserId);
    const aiRationale = await this.buildRationale(authUserId, priorityTags);

    return this.mealPlanModel.findOneAndUpdate(
      { authUserId, weekStartDate },
      {
        $set: {
          authUserId,
          weekStartDate,
          days,
          epigeneticScore: scores.overall,
          generatedBy: 'auto',
          aiRationale,
        },
      },
      { new: true, upsert: true },
    );
  }

  async getForWeek(authUserId: string, weekStartDate?: string): Promise<MealPlan> {
    const filter = weekStartDate ? { authUserId, weekStartDate } : { authUserId };
    const plan = await this.mealPlanModel.findOne(filter).sort({ weekStartDate: -1 });
    if (!plan) {
      throw new NotFoundException('No meal plan found — generate one first via POST /epidiet/meal-plans/generate');
    }
    return plan;
  }

  /** Manual drag-and-drop edits to an existing plan. */
  async update(authUserId: string, planId: string, dto: UpdateMealPlanDto): Promise<MealPlan> {
    const plan = await this.mealPlanModel.findOneAndUpdate(
      { _id: planId, authUserId },
      { $set: { days: dto.days, generatedBy: 'manual' } },
      { new: true },
    );
    if (!plan) {
      throw new NotFoundException('Meal plan not found');
    }
    return plan;
  }
}
