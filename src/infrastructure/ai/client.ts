/**
 * Centralized AI Client for Clinical Cloud.
 *
 * Uses the OpenAI SDK configured to connect through the local OmniRoute gateway
 * (or configured provider), using DeepSeek (deepseek/deepseek-chat) as the primary model.
 */

import OpenAI from 'openai';
import { aiConfig, getAiConfig } from './config';

/**
 * Creates a new OpenAI client instance configured with current environment settings.
 */
export function createAiClient(): OpenAI {
  const config = getAiConfig();
  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
}

/**
 * Singleton OpenAI client instance for AI operations across the application.
 */
export const aiClient: OpenAI = new OpenAI({
  baseURL: aiConfig.baseURL,
  apiKey: aiConfig.apiKey,
});

/**
 * Default AI Model configured for the application (deepseek/deepseek-chat).
 */
export const DEFAULT_AI_MODEL: string = aiConfig.defaultModel;
