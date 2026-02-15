import { describe, test, expect } from 'vitest';
import { buildRouterPrompt, buildSpecialistPrompt } from './templates.js';

describe('buildRouterPrompt', () => {
  test('includes extracted text in XML tag', () => {
    const prompt = buildRouterPrompt('Texto do processo judicial...');
    expect(prompt).toContain('<texto_extraido>');
    expect(prompt).toContain('Texto do processo judicial...');
    expect(prompt).toContain('</texto_extraido>');
  });

  test('instructs JSON output with required fields', () => {
    const prompt = buildRouterPrompt('qualquer texto');
    expect(prompt).toContain('legalMatter');
    expect(prompt).toContain('decisionType');
    expect(prompt).toContain('complexity');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('reasoning');
    expect(prompt).toContain('JSON');
  });

  test('lists valid enum values for classification', () => {
    const prompt = buildRouterPrompt('texto');
    expect(prompt).toContain('liminar');
    expect(prompt).toContain('sentenca');
    expect(prompt).toContain('despacho');
    expect(prompt).toContain('acordao');
    expect(prompt).toContain('civil');
    expect(prompt).toContain('criminal');
    expect(prompt).toContain('labor');
    expect(prompt).toContain('tax');
  });
});

describe('buildSpecialistPrompt', () => {
  test('includes FIRAC structure instructions', () => {
    const prompt = buildSpecialistPrompt({
      text: 'Fatos do caso...',
      legalMatter: 'civil',
      decisionType: 'sentenca',
    });
    expect(prompt).toContain('FATOS');
    expect(prompt).toContain('QUESTAO');
    expect(prompt).toContain('REGRA');
    expect(prompt).toContain('ANALISE');
    expect(prompt).toContain('CONCLUSAO');
  });

  test('includes legal matter and decision type context', () => {
    const prompt = buildSpecialistPrompt({
      text: 'texto',
      legalMatter: 'labor',
      decisionType: 'liminar',
    });
    expect(prompt).toContain('labor');
    expect(prompt).toContain('liminar');
  });

  test('includes RAG context when provided', () => {
    const prompt = buildSpecialistPrompt({
      text: 'texto',
      legalMatter: 'civil',
      decisionType: 'sentenca',
      ragContext: 'Súmula 297 STJ: CDC aplica-se a contratos bancários',
    });
    expect(prompt).toContain('<contexto_legal>');
    expect(prompt).toContain('Súmula 297 STJ');
    expect(prompt).toContain('</contexto_legal>');
  });
});
