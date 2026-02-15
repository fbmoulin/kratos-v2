import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * Creates a ChatGoogleGenerativeAI instance for Gemini models.
 */
export function createGoogleModel(modelId: string) {
  return new ChatGoogleGenerativeAI({
    model: modelId,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });
}
