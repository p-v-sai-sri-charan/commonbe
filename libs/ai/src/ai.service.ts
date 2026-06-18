import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiProviderId, AiReply, ChatMessage } from './providers/ai-provider.interface';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAiProvider } from './providers/openai.provider';

/**
 * Facade used by any app that needs AI text generation (epidiet-service's
 * coach/meal-plan rationale today; ecom-service's AI features next).
 *
 * Provider selection is a single env var (AI_PROVIDER=claude|openai) — swap
 * it without touching any calling code.
 */
@Injectable()
export class AiService {
  private readonly providers: Map<AiProviderId, AiProvider>;

  constructor(
    private readonly configService: ConfigService,
    claude: ClaudeProvider,
    openai: OpenAiProvider,
  ) {
    this.providers = new Map([claude, openai].map((provider) => [provider.id, provider]));
  }

  getActiveProviderId(): AiProviderId {
    return (this.configService.get<string>('AI_PROVIDER') as AiProviderId) ?? AiProviderId.CLAUDE;
  }

  isConfigured(providerId: AiProviderId = this.getActiveProviderId()): boolean {
    return this.providers.get(providerId)?.isConfigured() ?? false;
  }

  async generateReply(messages: ChatMessage[]): Promise<AiReply> {
    const providerId = this.getActiveProviderId();
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new BadGatewayException(`Unknown AI_PROVIDER "${providerId}"`);
    }
    return provider.generateReply(messages);
  }
}
