/**
 * End-to-end pipeline test with real legal PDFs.
 *
 * Runs each stage: Router (Gemini) → FIRAC+ (Claude) → Drafter (Claude)
 *
 * Usage: node --env-file=.env node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/test-e2e-pipeline.ts [domain]
 */
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Verify keys
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!GEMINI_KEY || GEMINI_KEY.startsWith('your-')) {
  console.error('ERROR: GEMINI_API_KEY not set. Use: node --env-file=.env ...');
  process.exit(1);
}
if (!ANTHROPIC_KEY || ANTHROPIC_KEY.startsWith('your-')) {
  console.error('ERROR: ANTHROPIC_API_KEY not set. Use: node --env-file=.env ...');
  process.exit(1);
}

console.log('API keys loaded successfully');

import { buildRouterPrompt } from '../packages/ai/src/prompts/templates.js';
import { buildFiracEnterprisePrompt } from '../packages/ai/src/prompts/firac-enterprise.js';
import { buildDrafterXml, getDomainPrompt } from '../packages/ai/src/prompts/drafter.js';
import { classifyComplexity, selectModel } from '../packages/ai/src/router/model-router.js';
import { createGoogleModel } from '../packages/ai/src/providers/google.js';
import { createAnthropicModel } from '../packages/ai/src/providers/anthropic.js';

interface PdfExtraction {
  domain: string;
  path: string;
  pages: number;
  char_count: number;
  text: string;
}

/**
 * Extract text content from LangChain response.
 * When thinking is enabled, content is an array of blocks — extract just the text.
 */
function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textBlock = content.find((b: any) => b.type === 'text');
    return textBlock?.text ?? JSON.stringify(content);
  }
  return JSON.stringify(content);
}

const extractionsPath = resolve(__dirname, 'test-real-pdfs-output.json');
const extractions: PdfExtraction[] = JSON.parse(readFileSync(extractionsPath, 'utf-8'));

const targetDomain = process.argv[2] || 'bancario';
const extraction = extractions.find((e) => e.domain === targetDomain);

if (!extraction) {
  console.error(`Domain "${targetDomain}" not found. Available: ${extractions.map((e) => e.domain).join(', ')}`);
  process.exit(1);
}

// Truncate very large texts to keep API calls reasonable (first 40K chars ≈ 10K tokens)
const MAX_TEXT_CHARS = 40_000;
const rawText = extraction.text.slice(0, MAX_TEXT_CHARS);
const truncated = rawText.length < extraction.text.length;

console.log(`\n${'='.repeat(70)}`);
console.log(`KRATOS v2 — E2E Pipeline Test`);
console.log(`Domain: ${extraction.domain.toUpperCase()}`);
console.log(`Process: ${extraction.path}`);
console.log(`Pages: ${extraction.pages} | Chars: ${extraction.char_count.toLocaleString()}${truncated ? ` (truncated to ${MAX_TEXT_CHARS.toLocaleString()})` : ''}`);
console.log(`${'='.repeat(70)}\n`);

const routerText = extraction.text.slice(0, 8000);

async function runPipeline() {
  const totalStart = Date.now();

  // ─── STAGE 1: Router (Gemini Flash) ────────────────────────────────
  console.log('STAGE 1: Router (Gemini Flash)...');
  const routerStart = Date.now();

  const routerPrompt = buildRouterPrompt(routerText);
  const gemini = createGoogleModel('gemini-2.0-flash');

  let routerResult: any;
  try {
    const routerResponse = await gemini.invoke(routerPrompt);
    const routerContent = extractTextContent(routerResponse.content);

    const jsonMatch = routerContent.match(/\{[\s\S]*\}/);
    routerResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(routerContent);

    const routerMs = Date.now() - routerStart;
    console.log(`  legalMatter:  ${routerResult.legalMatter}`);
    console.log(`  decisionType: ${routerResult.decisionType}`);
    console.log(`  complexity:   ${routerResult.complexity}`);
    console.log(`  confidence:   ${routerResult.confidence}`);
    console.log(`  reasoning:    ${(routerResult.reasoning || '').slice(0, 120)}...`);
    console.log(`  latency:      ${routerMs}ms`);
  } catch (err: any) {
    console.error(`  Router FAILED: ${err.message}`);
    process.exit(1);
  }

  // Complexity scoring
  const complexityScore = classifyComplexity({
    factLength: rawText.length,
    questionCount: routerResult.complexity > 50 ? 4 : 2,
    pedidoCount: routerResult.complexity > 50 ? 5 : 3,
    domainSpecialization: routerResult.confidence > 0.8 ? 0.7 : 0.4,
    entityRichness: 5,
    multiParty: false,
    routerConfidence: routerResult.confidence,
  });

  const { model: selectedModel, thinking } = selectModel(complexityScore);
  console.log(`  complexityScore: ${complexityScore}`);
  console.log(`  selectedModel:   ${selectedModel}`);
  console.log(`  thinking:        ${thinking ?? 'off'}`);

  // ─── STAGE 2: FIRAC+ Enterprise (Claude) ───────────────────────────
  console.log('\nSTAGE 2: FIRAC+ Enterprise Analysis (Claude)...');
  const firacStart = Date.now();

  const firacPrompt = buildFiracEnterprisePrompt({
    rawText,
    legalMatter: routerResult.legalMatter,
    decisionType: routerResult.decisionType,
  });

  console.log(`  Prompt size: ${firacPrompt.length.toLocaleString()} chars (~${Math.ceil(firacPrompt.length / 4).toLocaleString()} tokens)`);

  const claude = createAnthropicModel(selectedModel, {
    thinkingBudget: thinking ?? undefined,
  });

  let firacContent: string;
  try {
    const firacResponse = await claude.invoke(firacPrompt);
    firacContent = extractTextContent(firacResponse.content);

    const firacMs = Date.now() - firacStart;
    const usage = (firacResponse as any).usage_metadata;
    console.log(`  Output size:   ${firacContent.length.toLocaleString()} chars`);
    console.log(`  Tokens in:     ${usage?.input_tokens?.toLocaleString() ?? 'N/A'}`);
    console.log(`  Tokens out:    ${usage?.output_tokens?.toLocaleString() ?? 'N/A'}`);
    console.log(`  Latency:       ${firacMs}ms (${(firacMs / 1000).toFixed(1)}s)`);
    console.log(`  Preview:       ${firacContent.slice(0, 200).replace(/\n/g, ' ')}...`);
  } catch (err: any) {
    console.error(`  FIRAC FAILED: ${err.message}`);
    process.exit(1);
  }

  const firacResult = {
    facts: firacContent.slice(0, 500),
    issue: 'Extracted from FIRAC analysis',
    rule: 'Extracted from FIRAC analysis',
    analysis: firacContent,
    conclusion: 'See full FIRAC analysis',
  };

  // ─── STAGE 3: Drafter (Claude) ─────────────────────────────────────
  console.log('\nSTAGE 3: Drafter — Domain Minuta (Claude)...');
  const drafterStart = Date.now();

  const domainKey = routerResult.legalMatter === 'civil'
    ? extraction.domain
    : routerResult.legalMatter;
  const systemPrompt = getDomainPrompt(domainKey);
  console.log(`  Domain prompt: ${systemPrompt.split('\n')[0]}`);

  const xmlInput = buildDrafterXml({
    rawText,
    firacResult,
  });

  console.log(`  XML size:      ${xmlInput.length.toLocaleString()} chars (~${Math.ceil(xmlInput.length / 4).toLocaleString()} tokens)`);

  let draftContent: string;
  try {
    const drafterResponse = await claude.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'human', content: xmlInput },
    ]);

    draftContent = extractTextContent(drafterResponse.content);

    const drafterMs = Date.now() - drafterStart;
    const usage = (drafterResponse as any).usage_metadata;
    console.log(`  Output size:   ${draftContent.length.toLocaleString()} chars`);
    console.log(`  Tokens in:     ${usage?.input_tokens?.toLocaleString() ?? 'N/A'}`);
    console.log(`  Tokens out:    ${usage?.output_tokens?.toLocaleString() ?? 'N/A'}`);
    console.log(`  Latency:       ${drafterMs}ms (${(drafterMs / 1000).toFixed(1)}s)`);
  } catch (err: any) {
    console.error(`  Drafter FAILED: ${err.message}`);
    process.exit(1);
  }

  // ─── RESULTS ───────────────────────────────────────────────────────
  const totalMs = Date.now() - totalStart;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PIPELINE COMPLETE — Total: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`${'='.repeat(70)}`);

  const outputDir = resolve(__dirname, 'e2e-output');
  mkdirSync(outputDir, { recursive: true });

  const prefix = `${extraction.domain}-${extraction.path.split('/').pop()?.replace('.pdf', '')}`;

  writeFileSync(resolve(outputDir, `${prefix}-firac.md`), `# FIRAC+ Enterprise Analysis\n\n${firacContent}`, 'utf-8');
  writeFileSync(resolve(outputDir, `${prefix}-minuta.md`), `# Minuta — ${extraction.domain.toUpperCase()}\n\n${draftContent}`, 'utf-8');
  writeFileSync(resolve(outputDir, `${prefix}-router.json`), JSON.stringify({ ...routerResult, complexityScore, selectedModel, thinking }, null, 2), 'utf-8');

  console.log(`\nOutputs saved to: ${outputDir}/`);
  console.log(`  ${prefix}-router.json`);
  console.log(`  ${prefix}-firac.md`);
  console.log(`  ${prefix}-minuta.md`);
}

runPipeline().catch((err) => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
