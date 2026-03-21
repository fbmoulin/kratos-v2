#!/usr/bin/env tsx
/**
 * PDF Extraction Benchmark — SLA baseline measurement
 *
 * Measures extraction pipeline performance across PDF size classes.
 * Calls pdf_runner.py directly via subprocess (same bridge as Trigger.dev task).
 *
 * Usage:
 *   pnpm benchmark [pdf-directory]
 *   pnpm tsx scripts/benchmark-extraction.ts /path/to/pdfs
 *
 * Output:
 *   scripts/benchmark-results.json (raw data)
 *   scripts/benchmark-report.md   (formatted report)
 */
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { execa } from 'execa';
import { fileURLToPath } from 'node:url';
import { SLA } from '@kratos/core';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const PYTHON_RUNNER = resolve(__dirname, '..', 'workers', 'trigger', 'src', 'pdf_runner.py');

// ============================================================
// Types
// ============================================================

interface BenchmarkResult {
  fileName: string;
  fileSizeBytes: number;
  sizeClass: 'small' | 'medium' | 'large';
  totalTimeMs: number;
  pageCount: number;
  pagesPerSecond: number;
  tablesCount: number;
  extractionMethod: string;
  success: boolean;
  error?: string;
}

interface ClassSummary {
  count: number;
  avgTimeMs: number;
  p95TimeMs: number;
  avgPagesPerSecond: number;
  errorRate: number;
}

interface BenchmarkReport {
  timestamp: string;
  totalPdfs: number;
  pythonRunner: string;
  slaTargetMs: number;
  results: BenchmarkResult[];
  summary: {
    byClass: Record<string, ClassSummary>;
    overall: {
      avgTimeMs: number;
      p95TimeMs: number;
      successRate: number;
    };
  };
}

// ============================================================
// Helpers
// ============================================================

function classifySize(pages: number): 'small' | 'medium' | 'large' {
  if (pages < 10) return 'small';
  if (pages <= 50) return 'medium';
  return 'large';
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function findPdfs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const pdfs: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      pdfs.push(...(await findPdfs(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      const info = await stat(fullPath);
      // Skip PDFs over 50MB (matches API limit)
      if (info.size <= 50 * 1024 * 1024) {
        pdfs.push(fullPath);
      }
    }
  }

  return pdfs;
}

// ============================================================
// Benchmark runner
// ============================================================

async function benchmarkPdf(pdfPath: string): Promise<BenchmarkResult> {
  const info = await stat(pdfPath);
  const fileName = pdfPath.split('/').pop() ?? pdfPath;

  const input = JSON.stringify({
    documentId: `bench-${Date.now()}`,
    filePath: pdfPath, // pdf_runner reads from local path for benchmark
    userId: 'benchmark',
  });

  const startMs = performance.now();

  try {
    const proc = await execa('python3', [PYTHON_RUNNER], {
      input,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      timeout: 300_000,
    });

    const elapsed = performance.now() - startMs;
    const result = JSON.parse(proc.stdout);

    if (result.status === 'failed') {
      return {
        fileName,
        fileSizeBytes: info.size,
        sizeClass: 'small',
        totalTimeMs: elapsed,
        pageCount: 0,
        pagesPerSecond: 0,
        tablesCount: 0,
        extractionMethod: 'unknown',
        success: false,
        error: result.error,
      };
    }

    const pageCount = result.pageCount ?? 1;
    return {
      fileName,
      fileSizeBytes: info.size,
      sizeClass: classifySize(pageCount),
      totalTimeMs: elapsed,
      pageCount,
      pagesPerSecond: pageCount / (elapsed / 1000),
      tablesCount: result.tablesCount ?? 0,
      extractionMethod: result.extractionMethod ?? 'unknown',
      success: true,
    };
  } catch (err) {
    const elapsed = performance.now() - startMs;
    return {
      fileName,
      fileSizeBytes: info.size,
      sizeClass: 'small',
      totalTimeMs: elapsed,
      pageCount: 0,
      pagesPerSecond: 0,
      tablesCount: 0,
      extractionMethod: 'unknown',
      success: false,
      error: (err as Error).message,
    };
  }
}

function buildSummary(results: BenchmarkResult[]) {
  const classes = ['small', 'medium', 'large'] as const;
  const byClass: Record<string, ClassSummary> = {};

  for (const cls of classes) {
    const items = results.filter((r) => r.sizeClass === cls);
    if (items.length === 0) continue;

    const times = items.filter((r) => r.success).map((r) => r.totalTimeMs);
    const speeds = items.filter((r) => r.success).map((r) => r.pagesPerSecond);
    const failures = items.filter((r) => !r.success).length;

    byClass[cls] = {
      count: items.length,
      avgTimeMs: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      p95TimeMs: percentile(times, 95),
      avgPagesPerSecond: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      errorRate: failures / items.length,
    };
  }

  const allTimes = results.filter((r) => r.success).map((r) => r.totalTimeMs);
  const successCount = results.filter((r) => r.success).length;

  return {
    byClass,
    overall: {
      avgTimeMs: allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0,
      p95TimeMs: percentile(allTimes, 95),
      successRate: results.length > 0 ? successCount / results.length : 0,
    },
  };
}

function formatReport(report: BenchmarkReport): string {
  const { summary } = report;
  const slaPass = summary.overall.p95TimeMs <= report.slaTargetMs;

  let md = `# PDF Extraction Benchmark Report\n\n`;
  md += `**Date:** ${report.timestamp}\n`;
  md += `**PDFs tested:** ${report.totalPdfs}\n`;
  md += `**Runner:** \`${report.pythonRunner}\`\n\n`;

  md += `## Results by Size Class\n\n`;
  md += `| Class | Count | Avg Time | P95 Time | Pages/sec | Error Rate |\n`;
  md += `|-------|-------|----------|----------|-----------|------------|\n`;

  for (const [cls, data] of Object.entries(summary.byClass)) {
    md += `| ${cls} | ${data.count} | ${Math.round(data.avgTimeMs)}ms | ${Math.round(data.p95TimeMs)}ms | ${data.avgPagesPerSecond.toFixed(1)} | ${(data.errorRate * 100).toFixed(0)}% |\n`;
  }

  md += `\n## Overall\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Avg time | ${Math.round(summary.overall.avgTimeMs)}ms |\n`;
  md += `| P95 time | ${Math.round(summary.overall.p95TimeMs)}ms |\n`;
  md += `| Success rate | ${(summary.overall.successRate * 100).toFixed(0)}% |\n\n`;

  md += `## SLA Compliance\n\n`;
  md += `**Target:** P95 < ${report.slaTargetMs}ms\n`;
  md += `**Result:** ${Math.round(summary.overall.p95TimeMs)}ms — **${slaPass ? 'PASS' : 'FAIL'}**\n\n`;

  md += `## Individual Results\n\n`;
  md += `| File | Size | Pages | Time | Pages/s | Method | Status |\n`;
  md += `|------|------|-------|------|---------|--------|--------|\n`;

  for (const r of report.results) {
    const sizeKb = Math.round(r.fileSizeBytes / 1024);
    const status = r.success ? 'OK' : `FAIL: ${r.error?.slice(0, 40)}`;
    md += `| ${r.fileName} | ${sizeKb}KB | ${r.pageCount} | ${Math.round(r.totalTimeMs)}ms | ${r.pagesPerSecond.toFixed(1)} | ${r.extractionMethod} | ${status} |\n`;
  }

  return md;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const pdfDir = process.argv[2];

  if (!pdfDir) {
    console.error('Usage: pnpm benchmark <pdf-directory>');
    console.error('  e.g.: pnpm benchmark /mnt/c/projetos-2026/kratos-pdf-extractor-autonomo/tests/processos');
    process.exit(1);
  }

  const resolvedDir = resolve(pdfDir);
  console.log(`Scanning for PDFs in: ${resolvedDir}`);

  const pdfs = await findPdfs(resolvedDir);
  if (pdfs.length === 0) {
    console.error('No PDF files found in the specified directory.');
    process.exit(1);
  }

  console.log(`Found ${pdfs.length} PDFs. Starting benchmark...\n`);

  const results: BenchmarkResult[] = [];

  for (const pdf of pdfs) {
    const name = pdf.split('/').pop();
    process.stdout.write(`  Processing: ${name}...`);
    const result = await benchmarkPdf(pdf);
    results.push(result);
    console.log(` ${result.success ? 'OK' : 'FAIL'} (${Math.round(result.totalTimeMs)}ms, ${result.pageCount} pages)`);
  }

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    totalPdfs: pdfs.length,
    pythonRunner: PYTHON_RUNNER,
    slaTargetMs: SLA.PDF_PROCESSING_TARGET_MS,
    results,
    summary: buildSummary(results),
  };

  const outDir = resolve(__dirname);
  const jsonPath = join(outDir, 'benchmark-results.json');
  const mdPath = join(outDir, 'benchmark-report.md');

  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, formatReport(report));

  console.log(`\nResults written to:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  Report: ${mdPath}`);

  const { overall } = report.summary;
  const slaPass = overall.p95TimeMs <= report.slaTargetMs;
  console.log(`\nSLA: P95=${Math.round(overall.p95TimeMs)}ms (target: ${report.slaTargetMs}ms) — ${slaPass ? 'PASS' : 'FAIL'}`);

  process.exit(slaPass ? 0 : 1);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
