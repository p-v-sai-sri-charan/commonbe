export enum AiProviderId {
  CLAUDE = 'claude',
  OPENAI = 'openai',
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiReply {
  content: string;
  /** Best-effort token count, used to decrement a user's aiTokenLimit. */
  tokensUsed: number;
  provider: AiProviderId;
}

export interface AiProvider {
  readonly id: AiProviderId;
  /** True once the required API key for this provider is present. */
  isConfigured(): boolean;
  generateReply(messages: ChatMessage[]): Promise<AiReply>;
}
