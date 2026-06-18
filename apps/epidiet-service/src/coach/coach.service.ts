import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { AiService, ChatMessage } from '@app/ai';
import { firstValueFrom } from 'rxjs';
import { Model } from 'mongoose';
import { BabyPlanService } from '../baby-plan/baby-plan.service';
import { BiologicalSex } from '../common/enums';
import { ProfileService } from '../profile/profile.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CoachMessage, CoachMessageDocument } from './schemas/coach-message.schema';

const FEMALE_SYSTEM_CONTEXT =
  "The user's epigenetic protocol is Female: estrogen & hormonal methylation. Key pathways: COMT/CYP1B1 estrogen " +
  'clearance, DIM/I3C from cruciferous vegetables, flaxseed lignans, and the estrobolome (gut bacteria recycling ' +
  'estrogen). Steer suggestions toward these, and away from processed soy, alcohol, and trans fats.';

const MALE_SYSTEM_CONTEXT =
  "The user's epigenetic protocol is Male: androgen & testosterone methylation. Key pathways: lycopene " +
  'demethylating GSTP1/RASSF1A, zinc as a CYP17A1 cofactor, sulforaphane reactivating GSTP1, and EPA/DHA reducing ' +
  '5-alpha-reductase/DHT conversion. Steer suggestions toward these, and away from processed meat, BPA/plastics, ' +
  'and excess alcohol.';

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);
  private readonly userServiceUrl: string;

  constructor(
    @InjectModel(CoachMessage.name) private readonly coachMessageModel: Model<CoachMessageDocument>,
    private readonly aiService: AiService,
    private readonly profileService: ProfileService,
    private readonly babyPlanService: BabyPlanService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:3002');
  }

  private async buildSystemPrompt(authUserId: string): Promise<string> {
    const profile = await this.profileService.findProfileOrNull(authUserId);
    const parts = [
      "You are EpiDiet's AI nutrition coach. You help users eat in ways that support healthy gene expression " +
        '(epigenetics) — not just calorie counting. Keep answers short, encouraging, and food-focused. Always ' +
        'include a brief reminder that you are not providing medical advice when health conditions come up.',
    ];

    if (profile?.biologicalSex === BiologicalSex.FEMALE) parts.push(FEMALE_SYSTEM_CONTEXT);
    if (profile?.biologicalSex === BiologicalSex.MALE) parts.push(MALE_SYSTEM_CONTEXT);

    if (profile?.tryingToConceive) {
      try {
        const babyPlan = await this.babyPlanService.getPlan(authUserId);
        parts.push(
          `The user is trying to conceive and has chosen the "${babyPlan.desiredGender}" baby-gender protocol. ` +
            'Reference the mother/father meal plans and the ~12-week (90 day) timeline when relevant.',
        );
      } catch {
        // No baby plan set yet — fine, just skip this context.
      }
    }

    return parts.join('\n\n');
  }

  /** Quick-start prompts, gender-aware per the spec. */
  async getQuickPrompts(authUserId: string): Promise<string[]> {
    const profile = await this.profileService.findProfileOrNull(authUserId);
    const common = ['What should I eat today for my epigenetic goals?', 'Explain my latest epigenetic score'];

    if (profile?.biologicalSex === BiologicalSex.FEMALE) {
      return [...common, 'What foods support healthy estrogen metabolism?', 'How does my cycle phase affect meal timing?'];
    }
    if (profile?.biologicalSex === BiologicalSex.MALE) {
      return [...common, 'What foods support prostate gene health?', 'How can I reduce inflammation this week?'];
    }
    return common;
  }

  private async consumeAiTokens(authUserId: string, amount: number): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.userServiceUrl}/users/internal/ai-tokens/consume`,
          { amount },
          { headers: { 'x-user-id': authUserId } },
        ),
      );
      return response.data.aiTokenLimit as number;
    } catch (error) {
      // If user-service is unreachable we still let the reply through rather
      // than failing the whole coach interaction over quota bookkeeping.
      this.logger.warn(`Failed to decrement AI token quota: ${(error as Error).message}`);
      return -1;
    }
  }

  private async getRemainingTokens(authUserId: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/users/me`, { headers: { 'x-user-id': authUserId } }),
      );
      return response.data.aiTokenLimit as number;
    } catch (error) {
      throw new BadRequestException(
        'Could not read your AI token quota from user-service — create a profile via POST /users/profile first',
      );
    }
  }

  async sendMessage(authUserId: string, dto: SendMessageDto) {
    const remaining = await this.getRemainingTokens(authUserId);
    if (remaining <= 0) {
      throw new ForbiddenException('AI token limit exhausted — see user-service profile.aiTokenLimit');
    }

    await this.coachMessageModel.create({ authUserId, role: 'user', content: dto.content });

    const history = await this.coachMessageModel.find({ authUserId }).sort({ createdAt: -1 }).limit(10);
    const systemPrompt = await this.buildSystemPrompt(authUserId);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.reverse().map((m) => ({ role: m.role, content: m.content })),
    ];

    const reply = await this.aiService.generateReply(messages);

    await this.coachMessageModel.create({
      authUserId,
      role: 'assistant',
      content: reply.content,
      provider: reply.provider,
    });

    const remainingAfter = await this.consumeAiTokens(authUserId, reply.tokensUsed);

    return { content: reply.content, provider: reply.provider, tokensUsed: reply.tokensUsed, remainingTokens: remainingAfter };
  }

  async getHistory(authUserId: string, limit = 50): Promise<CoachMessage[]> {
    return this.coachMessageModel.find({ authUserId }).sort({ createdAt: 1 }).limit(limit);
  }
}
