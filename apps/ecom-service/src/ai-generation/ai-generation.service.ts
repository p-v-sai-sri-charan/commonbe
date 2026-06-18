import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import OpenAI from 'openai';
import { AiCreditsService } from '../ai-credits/ai-credits.service';
import { CreatorService } from '../creator/creator.service';
import { GenerateImageDto } from './dto/generate-image.dto';
import { AiGeneration, AiGenerationDocument } from './schemas/ai-generation.schema';

const CREDITS_PER_GENERATION = 1;

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    @InjectModel(AiGeneration.name) private readonly generationModel: Model<AiGenerationDocument>,
    private readonly aiCreditsService: AiCreditsService,
    private readonly creatorService: CreatorService,
    private readonly configService: ConfigService,
  ) {}

  async generate(userId: string, dto: GenerateImageDto): Promise<{ imageUrl: string; creditsRemaining: number }> {
    const { useByok = false } = dto;

    let openai: OpenAI;
    let usedByok = false;
    let model = 'dall-e-3';

    if (useByok) {
      const byok = await this.creatorService.getDecryptedByokKey(userId);
      if (!byok || byok.provider !== 'openai') {
        throw new BadRequestException('No OpenAI BYOK key configured. Set it at POST /creator/me/byok');
      }
      openai = new OpenAI({ apiKey: byok.apiKey });
      usedByok = true;
    } else {
      const systemKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!systemKey) {
        throw new BadGatewayException('AI image generation is not configured');
      }
      await this.aiCreditsService.consume(userId, CREDITS_PER_GENERATION);
      openai = new OpenAI({ apiKey: systemKey });
    }

    let imageUrl: string;
    try {
      const response = await openai.images.generate({
        model,
        prompt: dto.prompt,
        n: 1,
        size: dto.size ?? '1024x1024',
        quality: dto.quality ?? 'standard',
        style: dto.style ?? 'vivid',
        response_format: 'url',
      });
      imageUrl = response.data?.[0]?.url ?? '';
      if (!imageUrl) throw new Error('No image URL in response');
    } catch (err: any) {
      if (!usedByok) {
        await this.aiCreditsService.grant(userId, CREDITS_PER_GENERATION, 'generation', 'refund');
      }
      this.logger.error(`DALL-E generation failed: ${err.message}`);
      throw new BadGatewayException('Image generation failed. Credits refunded.');
    }

    const record = await this.generationModel.create({
      userId,
      prompt: dto.prompt,
      provider: 'openai',
      model,
      usedByok,
      imageUrl,
      creditsUsed: usedByok ? 0 : CREDITS_PER_GENERATION,
    });

    const creditBalance = usedByok
      ? await this.aiCreditsService.getBalance(userId)
      : null;

    return {
      imageUrl,
      creditsRemaining: creditBalance?.balance ?? 0,
    };
  }

  async getHistory(userId: string, limit = 20): Promise<AiGeneration[]> {
    return this.generationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }
}
