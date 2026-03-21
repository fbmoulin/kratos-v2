import { describe, test, expect, vi } from 'vitest';

vi.mock('./prompt-resolver.js', () => ({
  resolvePrompt: vi.fn((_key: string, fallback: string) => Promise.resolve(fallback)),
}));

import { buildDrafterXml, getDomainPrompt, DOMAIN_MAP } from './drafter.js';
import type { FIRACResult, RAGContext } from '@kratos/core';

describe('buildDrafterXml', () => {
  const firac: FIRACResult = {
    facts: 'Autor celebrou contrato bancario.',
    issue: 'Abusividade de clausulas contratuais.',
    rule: 'CDC Art. 51, Sumula 297/STJ.',
    analysis: 'Clausulas abusivas identificadas.',
    conclusion: 'Parcial procedencia.',
  };

  const ragContext: RAGContext = {
    vectorResults: [{ content: 'Sumula 381/STJ aplicavel', score: 0.92, source: 'stj' }],
    graphResults: [{ content: 'CDC consumidor bancario', score: 0.88, path: [] }],
    fusedResults: [
      { content: 'Sumula 381/STJ aplicavel', score: 0.92, source: 'stj' },
      { content: 'CDC consumidor bancario', score: 0.88, source: 'graph' },
    ],
  };

  test('produces valid XML with all sections', () => {
    const xml = buildDrafterXml({
      rawText: 'SENTENCA. Vistos, etc.',
      firacResult: firac,
      ragContext,
    });

    expect(xml).toContain('<case>');
    expect(xml).toContain('</case>');
    expect(xml).toContain('<documentos>');
    expect(xml).toContain('<firac>');
    expect(xml).toContain('<graph_rag>');
  });

  test('includes raw text in <documentos> section', () => {
    const xml = buildDrafterXml({
      rawText: 'SENTENCA. Vistos, os autos do processo.',
      firacResult: firac,
    });

    expect(xml).toContain('SENTENCA. Vistos, os autos do processo.');
    expect(xml).toContain('<document id="extraction"');
  });

  test('includes FIRAC fields in <firac> section', () => {
    const xml = buildDrafterXml({
      rawText: 'Texto',
      firacResult: firac,
    });

    expect(xml).toContain('<fatos>Autor celebrou contrato bancario.</fatos>');
    expect(xml).toContain('<questoes>Abusividade de clausulas contratuais.</questoes>');
    expect(xml).toContain('<regras>CDC Art. 51, Sumula 297/STJ.</regras>');
    expect(xml).toContain('<analysis>Clausulas abusivas identificadas.</analysis>');
    expect(xml).toContain('<conclusion>Parcial procedencia.</conclusion>');
  });

  test('includes RAG context in <graph_rag> section', () => {
    const xml = buildDrafterXml({
      rawText: 'Texto',
      firacResult: firac,
      ragContext,
    });

    expect(xml).toContain('<graph_rag>');
    expect(xml).toContain('<status>available</status>');
    expect(xml).toContain('Sumula 381/STJ aplicavel');
    expect(xml).toContain('CDC consumidor bancario');
  });

  test('handles missing RAG context gracefully', () => {
    const xml = buildDrafterXml({
      rawText: 'Texto',
      firacResult: firac,
    });

    expect(xml).toContain('<graph_rag>');
    expect(xml).toContain('<status>unavailable</status>');
  });

  test('includes metadados when provided', () => {
    const xml = buildDrafterXml({
      rawText: 'Texto',
      firacResult: firac,
      metadados: {
        numeroProcesso: '0001234-56.2025.8.26.0001',
        orgaoJulgador: '1a Vara Civel',
        classe: 'Procedimento Comum',
        assunto: 'Revisional bancario',
      },
    });

    expect(xml).toContain('<numero_processo>0001234-56.2025.8.26.0001</numero_processo>');
    expect(xml).toContain('<orgao_julgador>1a Vara Civel</orgao_julgador>');
  });
});

describe('getDomainPrompt', () => {
  test('returns GENERICO prompt for unknown domain', async () => {
    const prompt = await getDomainPrompt('unknown_domain');
    expect(prompt).toContain('AGENTE JUDICIAL: GENERICO');
  });

  test('returns specific prompt for mapped domain', async () => {
    const prompt = await getDomainPrompt('bancario');
    expect(prompt).toContain('AGENTE JUDICIAL: BANCARIO');
    expect(prompt).toContain('litigios bancarios');
  });

  test('is case-insensitive', async () => {
    const prompt = await getDomainPrompt('BANCARIO');
    expect(prompt).toContain('AGENTE JUDICIAL: BANCARIO');
  });

  test('maps civil legalMatter to GENERICO by default', async () => {
    const prompt = await getDomainPrompt('civil');
    expect(prompt).toContain('AGENTE JUDICIAL: GENERICO');
  });
});

describe('DOMAIN_MAP', () => {
  test('has GENERICO as fallback key', () => {
    expect(DOMAIN_MAP).toHaveProperty('generico');
  });

  test('has at least bancario, consumidor, generico', () => {
    expect(Object.keys(DOMAIN_MAP)).toContain('bancario');
    expect(Object.keys(DOMAIN_MAP)).toContain('consumidor');
    expect(Object.keys(DOMAIN_MAP)).toContain('generico');
  });
});
