/**
 * AI Configuration for Clinical Cloud.
 *
 * Configures the connection to the AI provider / gateway (OmniRoute / OpenAI / DeepSeek).
 * Default provider: DeepSeek (deepseek/deepseek-chat) routed through local OmniRoute gateway.
 */

export interface AiConfig {
  provider: string;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
}

export function getAiConfig(): AiConfig {
  return {
    provider: process.env.AI_PROVIDER || 'deepseek',
    baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:20128/v1',
    apiKey: process.env.OPENAI_API_KEY || 'sk-omniroute-local',
    defaultModel: process.env.AI_MODEL || 'deepseek/deepseek-chat',
  };
}

export const aiConfig: AiConfig = getAiConfig();
