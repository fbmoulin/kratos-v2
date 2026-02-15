/**
 * Seed the `precedents` table with real STJ acordao data + OpenAI embeddings.
 *
 * Fetches JSON resources from STJ Dados Abertos CKAN API (4 turmas),
 * extracts ementa+decisao, generates embeddings via OpenAI API,
 * and inserts into Supabase via REST API (PostgREST).
 *
 * Uses Supabase REST API instead of direct Postgres connection
 * to avoid IPv6/pooler issues in WSL2.
 *
 * Usage:
 *   node --env-file=.env node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/seed-precedents.ts
 *   # or simply:
 *   pnpm seed
 */
import 'dotenv/config';

// ─── Configuration ──────────────────────────────────────────────────────────

const CKAN_BASE = 'https://dadosabertos.web.stj.jus.br/api/3/action';
const RECORDS_PER_TURMA = 25;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

/** Map turma dataset slugs to legal categories */
const TURMA_CONFIG = [
  { slug: 'espelhos-de-acordaos-primeira-turma', category: 'civil', label: '1ª Turma' },
  { slug: 'espelhos-de-acordaos-segunda-turma', category: 'civil', label: '2ª Turma' },
  { slug: 'espelhos-de-acordaos-terceira-turma', category: 'civil', label: '3ª Turma' },
  { slug: 'espelhos-de-acordaos-quarta-turma', category: 'civil', label: '4ª Turma' },
] as const;

const EMBED_BATCH_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

interface CkanPackage {
  result: {
    resources: Array<{
      id: string;
      name: string;
      format: string;
      url: string;
    }>;
  };
}

interface StjAcordao {
  id?: string;
  numeroProcesso?: string;
  siglaClasse?: string;
  nomeOrgaoJulgador?: string;
  ministroRelator?: string;
  ementa?: string;
  decisao?: string;
  referenciasLegislativas?: string;
  jurisprudenciaCitada?: string;
  tema?: string;
  teseJuridica?: string;
  dataJulgamento?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

function buildContent(acordao: StjAcordao): string {
  const parts: string[] = [];
  if (acordao.ementa) parts.push(acordao.ementa);
  if (acordao.decisao) parts.push(`DECISÃO: ${acordao.decisao}`);
  if (acordao.referenciasLegislativas) parts.push(`LEGISLAÇÃO: ${acordao.referenciasLegislativas}`);
  if (acordao.teseJuridica) parts.push(`TESE: ${acordao.teseJuridica}`);
  return parts.join('\n\n');
}

function buildMetadata(acordao: StjAcordao) {
  return {
    numeroProcesso: acordao.numeroProcesso ?? null,
    siglaClasse: acordao.siglaClasse ?? null,
    orgaoJulgador: acordao.nomeOrgaoJulgador ?? null,
    ministroRelator: acordao.ministroRelator ?? null,
    tema: acordao.tema ?? null,
    dataJulgamento: acordao.dataJulgamento ?? null,
  };
}

/** Generate embeddings via OpenAI API directly (no LangChain dependency) */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
}

/** Insert records via Supabase REST API (PostgREST) */
async function supabaseInsert(records: Array<Record<string, unknown>>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/precedents`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(records),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert ${res.status}: ${err}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Validate env
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith('your-')) {
    console.error('ERROR: OPENAI_API_KEY not set.');
    process.exit(1);
  }
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-')) {
    console.error('ERROR: SUPABASE_URL not set.');
    process.exit(1);
  }
  if (!SUPABASE_KEY || SUPABASE_KEY.startsWith('your-')) {
    console.error('ERROR: SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY not set.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('KRATOS v2 — Seed Precedents from STJ Dados Abertos');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('='.repeat(60));

  const allRecords: Array<{ content: string; category: string; source: string; metadata: Record<string, unknown> }> = [];

  // 1. Fetch JSON resources from each turma
  for (const turma of TURMA_CONFIG) {
    console.log(`\nFetching dataset: ${turma.label} (${turma.slug})...`);

    try {
      const pkg = await fetchJson<CkanPackage>(`${CKAN_BASE}/package_show?id=${turma.slug}`);
      const jsonResources = pkg.result.resources.filter(
        (r) => r.format.toUpperCase() === 'JSON',
      );

      if (jsonResources.length === 0) {
        console.warn(`  No JSON resources found for ${turma.slug}, skipping`);
        continue;
      }

      // Get the latest resource (last in list)
      const resource = jsonResources[jsonResources.length - 1];
      console.log(`  Resource: ${resource.name} (${resource.id})`);

      const acordaos = await fetchJson<StjAcordao[]>(resource.url);
      console.log(`  Total records in file: ${acordaos.length}`);

      // Take first N records with non-empty ementa
      const valid = acordaos
        .filter((a) => a.ementa && a.ementa.length > 50)
        .slice(0, RECORDS_PER_TURMA);

      console.log(`  Selected ${valid.length} records with valid ementa`);

      for (const acordao of valid) {
        const content = buildContent(acordao);
        if (content.length < 100) continue;

        allRecords.push({
          content,
          category: turma.category,
          source: `STJ - ${turma.label} - ${acordao.numeroProcesso || resource.name}`,
          metadata: buildMetadata(acordao),
        });
      }
    } catch (err: any) {
      console.error(`  Failed to fetch ${turma.slug}: ${err.message}`);
      continue;
    }
  }

  console.log(`\nTotal records to seed: ${allRecords.length}`);

  if (allRecords.length === 0) {
    console.error('No records to seed. Check network connectivity to dadosabertos.web.stj.jus.br');
    process.exit(1);
  }

  // 2. Generate embeddings in batches
  console.log('\nGenerating embeddings via OpenAI API...');
  const embeddings: number[][] = [];

  for (let i = 0; i < allRecords.length; i += EMBED_BATCH_SIZE) {
    const batch = allRecords.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((r) => r.content.slice(0, 8000));
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allRecords.length / EMBED_BATCH_SIZE);
    console.log(`  Embedding batch ${batchNum}/${totalBatches} (${texts.length} texts)...`);

    const batchEmbeddings = await embedBatch(texts);
    embeddings.push(...batchEmbeddings);
  }

  console.log(`  Generated ${embeddings.length} embeddings (${embeddings[0]?.length ?? 0}d)`);

  // 3. Insert into Supabase via REST API
  console.log('\nInserting into precedents table via Supabase REST API...');
  const INSERT_BATCH = 25;

  let inserted = 0;
  for (let i = 0; i < allRecords.length; i += INSERT_BATCH) {
    const batch = allRecords.slice(i, i + INSERT_BATCH).map((record, idx) => ({
      content: record.content,
      embedding: JSON.stringify(embeddings[i + idx]),
      category: record.category,
      source: record.source,
      metadata: record.metadata,
    }));

    await supabaseInsert(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${allRecords.length}`);
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('SEED COMPLETE');
  console.log(`  Records inserted: ${inserted}`);
  console.log(`  Embedding dimensions: 1536 (text-embedding-3-small)`);
  console.log(`  Categories: ${[...new Set(allRecords.map((r) => r.category))].join(', ')}`);
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
