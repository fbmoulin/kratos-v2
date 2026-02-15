/**
 * Direct FIRAC+ test — isolates the Claude call to debug timeout.
 * Usage: node --env-file=.env node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/test-firac-direct.ts
 */
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { buildFiracEnterprisePrompt } from '../packages/ai/src/prompts/firac-enterprise.js';
import { createAnthropicModel } from '../packages/ai/src/providers/anthropic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extractions = JSON.parse(readFileSync(resolve(__dirname, 'test-real-pdfs-output.json'), 'utf-8'));
const text = extractions[0].text.slice(0, 15_000); // ~3.7K tokens

const prompt = buildFiracEnterprisePrompt({
  rawText: text,
  legalMatter: 'civil',
  decisionType: 'sentenca',
});

console.log(`Prompt: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens)`);

// Test 1: No thinking
console.log('\n--- Test 1: Sonnet WITHOUT thinking ---');
const start1 = Date.now();
const m1 = createAnthropicModel('claude-sonnet-4-5-20250929');
const r1 = await m1.invoke(prompt);
const c1 = typeof r1.content === 'string' ? r1.content : JSON.stringify(r1.content);
console.log(`Latency: ${Date.now() - start1}ms`);
console.log(`Output: ${c1.length} chars`);
console.log(`Preview: ${c1.slice(0, 200).replace(/\n/g, ' ')}...`);

// Test 2: With thinking
console.log('\n--- Test 2: Sonnet WITH 4K thinking ---');
const start2 = Date.now();
const m2 = createAnthropicModel('claude-sonnet-4-5-20250929', { thinkingBudget: 4096 });
const r2 = await m2.invoke(prompt);
const c2Array = Array.isArray(r2.content) ? r2.content : [{ type: 'text', text: r2.content }];
const textBlock = c2Array.find((b: any) => b.type === 'text');
console.log(`Latency: ${Date.now() - start2}ms`);
console.log(`Output: ${textBlock?.text?.length ?? 0} chars`);
console.log(`Preview: ${(textBlock?.text ?? '').slice(0, 200).replace(/\n/g, ' ')}...`);

console.log('\nBoth tests passed!');
