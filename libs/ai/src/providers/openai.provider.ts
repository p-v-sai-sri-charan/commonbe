import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiProvider, AiProviderId, AiReply, ChatMessage } from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly id = AiProviderId.OPENAI;
  private readonly logger = new Logger(OpenAiProvider.name);
  private client: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('OPENAI_API_KEY'));
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.configService.get<string>('OPENAI_API_KEY') });
    }
    return this.client;
  }

  async generateReply(messages: ChatMessage[]): Promise<AiReply> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');

    try {
      const response = await this.getClient().chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      return {
        content: response.choices[0]?.message?.content ?? '',
        tokensUsed: response.usage?.total_tokens ?? 0,
        provider: this.id,
      };
    } catch (error) {
      this.logger.error(`OpenAI request failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('AI provider (OpenAI) request failed');
    }
  }
}
