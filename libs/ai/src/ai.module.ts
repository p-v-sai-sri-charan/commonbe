import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  providers: [AiService, ClaudeProvider, OpenAiProvider],
  exports: [AiService],
})
export class AiModule {}
