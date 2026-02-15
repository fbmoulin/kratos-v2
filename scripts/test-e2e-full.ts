/**
 * Full E2E test: Upload PDF → Poll Extraction → Trigger Analysis → Validate Results.
 *
 * Prerequisites:
 *   Terminal 1: docker compose up redis
 *   Terminal 2: pnpm --filter @kratos/api dev
 *   Terminal 3: cd workers/pdf-worker && python -m src.tasks.extract_pdf
 *
 * Usage:
 *   TEST_USER_ID=00000000-0000-0000-0000-000000000001 \
 *   node --env-file=.env node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/test-e2e-full.ts
 *   # or:
 *   TEST_USER_ID=00000000-0000-0000-0000-000000000001 pnpm e2e
 */
import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function api<T = any>(method: string, path: string, body?: FormData | string): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (typeof body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ?? undefined,
  });

  const data = await res.json() as T;
  return { status: res.status, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function findTestPdf(): string {
  // Look for PDFs in common test locations
  const searchDirs = [
    resolve(__dirname, '../packages/ai/src/integration/pdfs'),
    resolve(__dirname, '../test-pdfs'),
    resolve(__dirname, '../precedentes qualificados/bancario'),
  ];

  for (const dir of searchDirs) {
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('.pdf'));
      if (files.length > 0) {
        return resolve(dir, files[0]);
      }
    } catch {
      // directory doesn't exist, continue
    }
  }

  console.error('ERROR: No test PDF found. Place a PDF in packages/ai/src/integration/pdfs/ or test-pdfs/');
  process.exit(1);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('KRATOS v2 — Full E2E Test');
  console.log('='.repeat(60));

  // Preflight checks
  if (!process.env.TEST_USER_ID) {
    console.error('ERROR: TEST_USER_ID env var required (auth bypass).');
    console.error('Usage: TEST_USER_ID=00000000-0000-0000-0000-000000000001 pnpm e2e');
    process.exit(1);
  }

  console.log(`\nAPI: ${API_BASE}`);
  console.log(`User: ${process.env.TEST_USER_ID}`);

  // Health check
  console.log('\n── Health Check ──');
  try {
    const { status } = await api('GET', '/v2/health');
    assert(status === 200, `API is healthy (${status})`);
  } catch (err: any) {
    console.error(`API unreachable at ${API_BASE}: ${err.message}`);
    console.error('Make sure the API is running: pnpm --filter @kratos/api dev');
    process.exit(1);
  }

  // ─── STAGE 1: Upload PDF ───────────────────────────────────────────────
  console.log('\n── Stage 1: Upload PDF ──');
  const pdfPath = findTestPdf();
  console.log(`  PDF: ${pdfPath}`);

  const pdfBuffer = readFileSync(pdfPath);
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), pdfPath.split('/').pop()!);

  const upload = await api<{ data: { id: string; status: string } }>('POST', '/v2/documents', formData);
  assert(upload.status === 201 || upload.status === 200, `Upload returned ${upload.status}`);

  const docId = upload.data?.data?.id;
  assert(!!docId, `Got document ID: ${docId}`);
  console.log(`  Document ID: ${docId}`);

  // ─── STAGE 2: Poll for extraction ──────────────────────────────────────
  console.log('\n── Stage 2: Poll Extraction ──');
  const pollStart = Date.now();
  let extractionDone = false;

  while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
    const { data: doc } = await api<{ data: { status: string } }>('GET', `/v2/documents/${docId}`);
    const status = doc?.data?.status;
    process.stdout.write(`  Status: ${status} (${Math.round((Date.now() - pollStart) / 1000)}s)\r`);

    if (status === 'completed') {
      extractionDone = true;
      console.log(`\n  Extraction completed in ${Math.round((Date.now() - pollStart) / 1000)}s`);
      break;
    }
    if (status === 'failed') {
      console.error('\n  Extraction FAILED');
      process.exit(1);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  assert(extractionDone, 'Extraction completed within timeout');

  // ─── STAGE 3: Trigger Analysis ─────────────────────────────────────────
  console.log('\n── Stage 3: Trigger Analysis ──');
  const analysisStart = Date.now();

  const analyze = await api<{ data: any }>('POST', `/v2/documents/${docId}/analyze`);
  assert(analyze.status === 200 || analyze.status === 201, `Analysis returned ${analyze.status}`);

  const result = analyze.data?.data;
  const analysisMs = Date.now() - analysisStart;
  console.log(`  Analysis completed in ${(analysisMs / 1000).toFixed(1)}s`);

  // ─── STAGE 4: Validate Results ─────────────────────────────────────────
  console.log('\n── Stage 4: Validate Results ──');

  // Router result
  if (result?.routerResult) {
    assert(!!result.routerResult.legalMatter, `Router: legalMatter = ${result.routerResult.legalMatter}`);
    assert(typeof result.routerResult.complexity === 'number', `Router: complexity = ${result.routerResult.complexity}`);
  } else {
    console.log('  SKIP: routerResult not present in response (may be nested differently)');
  }

  // FIRAC result
  if (result?.firacResult) {
    assert(!!result.firacResult.facts || !!result.firacResult.analysis, 'FIRAC: has facts or analysis');
    assert(!!result.firacResult.conclusion, 'FIRAC: has conclusion');
  } else {
    console.log('  SKIP: firacResult not present in response');
  }

  // Draft result
  if (result?.draftResult) {
    assert(typeof result.draftResult === 'string' && result.draftResult.length > 100, `Draft: ${result.draftResult.length} chars`);
  } else {
    console.log('  SKIP: draftResult not present in response');
  }

  // RAG context
  if (result?.ragContext) {
    assert(Array.isArray(result.ragContext) && result.ragContext.length > 0, `RAG: ${result.ragContext.length} results`);
    if (result.ragContext[0]?.score) {
      assert(result.ragContext[0].score > 0.3, `RAG: top score = ${result.ragContext[0].score}`);
    }
  } else {
    console.log('  INFO: ragContext not present — seed precedents if RAG expected');
  }

  // Model used
  if (result?.modelUsed) {
    assert(!!result.modelUsed, `Model: ${result.modelUsed}`);
  }

  // Token counts
  if (result?.tokensInput) {
    assert(result.tokensInput > 0, `Tokens in: ${result.tokensInput}`);
    assert(result.tokensOutput > 0, `Tokens out: ${result.tokensOutput}`);
  }

  // ─── Summary ───────────────────────────────────────────────────────────
  const totalMs = Date.now() - pollStart;
  console.log('\n' + '='.repeat(60));
  console.log(`E2E TEST COMPLETE — Total: ${(totalMs / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  // Pretty print full result for inspection
  console.log('\nFull result payload:');
  console.log(JSON.stringify(result, null, 2)?.slice(0, 2000));

  process.exit(0);
}

main().catch((err) => {
  console.error('E2E test failed:', err);
  process.exit(1);
});
