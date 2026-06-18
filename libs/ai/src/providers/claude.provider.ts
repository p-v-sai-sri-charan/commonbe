import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, AiProviderId, AiReply, ChatMessage } from './ai-provider.interface';

@Injectable()
export class ClaudeProvider implements AiProvider {
  readonly id = AiProviderId.CLAUDE;
  private readonly logger = new Logger(ClaudeProvider.name);
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('ANTHROPIC_API_KEY'));
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: this.configService.get<string>('ANTHROPIC_API_KEY') });
    }
    return this.client;
  }

  async generateReply(messages: ChatMessage[]): Promise<AiReply> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not configured');
    }

    const system = messages.find((m) => m.role === 'system')?.content;
    const conversation = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const model = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-4-6');

    try {
      const response = await this.getClient().messages.create({
        model,
        max_tokens: 1024,
        system,
        messages: conversation,
      });

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { text: string }).text)
        .join('\n');

      return {
        content,
        tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
        provider: this.id,
      };
    } catch (error) {
      this.logger.error(`Claude request failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('AI provider (Claude) request failed');
    }
  }
}
