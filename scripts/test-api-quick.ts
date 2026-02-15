/**
 * Quick API sanity check — verifies Anthropic key works.
 * Usage: node --env-file=.env node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/test-api-quick.ts
 */
import { createAnthropicModel } from '../packages/ai/src/providers/anthropic.js';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY || ANTHROPIC_KEY.startsWith('your-')) {
  console.error('ANTHROPIC_API_KEY not set');
  process.exit(1);
}

console.log('Testing Claude API (no thinking)...');
const start = Date.now();
const model = createAnthropicModel('claude-sonnet-4-5-20250929');
const response = await model.invoke('Diga apenas: TESTE OK');
const content = typeof response.content === 'string'
  ? response.content
  : JSON.stringify(response.content);
console.log(`Response: ${content}`);
console.log(`Latency: ${Date.now() - start}ms`);

console.log('\nTesting Claude API (with thinking 4K)...');
const start2 = Date.now();
const model2 = createAnthropicModel('claude-sonnet-4-5-20250929', { thinkingBudget: 4096 });
const response2 = await model2.invoke('Qual é 2+2? Responda apenas o número.');
const content2 = typeof response2.content === 'string'
  ? response2.content
  : JSON.stringify(response2.content);
console.log(`Response: ${content2}`);
console.log(`Latency: ${Date.now() - start2}ms`);
console.log('\nAll API tests passed!');
