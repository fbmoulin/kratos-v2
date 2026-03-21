import { describe, test, expect, vi } from 'vitest';

vi.mock('./prompt-resolver.js', () => ({
  resolvePrompt: vi.fn((_key: string, fallback: string) => Promise.resolve(fallback)),
}));

import { buildFiracEnterprisePrompt } from './firac-enterprise.js';

describe('buildFiracEnterprisePrompt', () => {
  const baseInput = {
    rawText: 'SENTENÇA. Vistos. Trata-se de ação de indenização...',
    legalMatter: 'civil',
    decisionType: 'sentenca',
  };

  test('includes all 7 FIRAC+ phases', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).toContain('FASE 1');
    expect(prompt).toContain('FASE 2');
    expect(prompt).toContain('FASE 3');
    expect(prompt).toContain('FASE 4');
    expect(prompt).toContain('FASE 5');
    expect(prompt).toContain('FASE 6');
    expect(prompt).toContain('FASE 7');
  });

  test('includes anti-hallucination rules and document anchoring', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).toContain('regras_inviolaveis');
    expect(prompt).toContain('FIDELIDADE DOCUMENTAL');
    expect(prompt).toContain('ANTI-ALUCINAÇÃO');
    expect(prompt).toContain('NÃO CONSTA NOS AUTOS');
    expect(prompt).toContain('VERIFICAR');
  });

  test('includes CNJ compliance context', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).toContain('CNJ 332/2020');
    expect(prompt).toContain('CNJ 615/2025');
    expect(prompt).toContain('LGPD');
    expect(prompt).toContain('NUNCA substituição da decisão humana');
  });

  test('wraps document text in XML tags', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).toContain('<documentos_do_processo>');
    expect(prompt).toContain('ação de indenização');
    expect(prompt).toContain('</documentos_do_processo>');
  });

  test('includes legal matter and decision type in context', async () => {
    const prompt = await buildFiracEnterprisePrompt({
      ...baseInput,
      legalMatter: 'labor',
      decisionType: 'liminar',
    });
    expect(prompt).toContain('MATÉRIA: labor');
    expect(prompt).toContain('TIPO_DECISÃO: liminar');
  });

  test('injects RAG context when provided', async () => {
    const prompt = await buildFiracEnterprisePrompt({
      ...baseInput,
      ragContext: 'Súmula 297 STJ: O CDC é aplicável às instituições financeiras.',
    });
    expect(prompt).toContain('<contexto_legal_rag>');
    expect(prompt).toContain('Súmula 297 STJ');
    expect(prompt).toContain('</contexto_legal_rag>');
  });

  test('omits RAG section when no context provided', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).not.toContain('<contexto_legal_rag>');
  });

  test('activates liminar module', async () => {
    const prompt = await buildFiracEnterprisePrompt({
      ...baseInput,
      modulo: 'liminar',
    });
    expect(prompt).toContain('<modulo_ativado>');
    expect(prompt).toContain('MINUTA DE DECISÃO INTERLOCUTÓRIA');
    expect(prompt).toContain('art. 300 do CPC');
  });

  test('activates sentenca module', async () => {
    const prompt = await buildFiracEnterprisePrompt({
      ...baseInput,
      modulo: 'sentenca',
    });
    expect(prompt).toContain('MINUTA DE SENTENÇA');
    expect(prompt).toContain('art. 489, §1º do CPC');
  });

  test('activates analise_focada module with tema', async () => {
    const prompt = await buildFiracEnterprisePrompt({
      ...baseInput,
      modulo: 'analise_focada',
      temaFocado: 'responsabilidade civil',
    });
    expect(prompt).toContain('ANÁLISE FOCADA EM RESPONSABILIDADE CIVIL');
    expect(prompt).toContain('correntes doutrinárias');
  });

  test('activates comparacao_teses module', async () => {
    const prompt = await buildFiracEnterprisePrompt({
      ...baseInput,
      modulo: 'comparacao_teses',
    });
    expect(prompt).toContain('COMPARAÇÃO DE TESES');
    expect(prompt).toContain('tabela comparativa');
  });

  test('includes key FIRAC sections: fatos, questões, regras, análise, conclusão', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).toContain('INVENTÁRIO FÁTICO');
    expect(prompt).toContain('QUESTÕES JURÍDICAS');
    expect(prompt).toContain('DIREITO APLICÁVEL');
    expect(prompt).toContain('ANÁLISE E APLICAÇÃO');
    expect(prompt).toContain('CONCLUSÃO');
    expect(prompt).toContain('VALIDAÇÃO E CERTIFICAÇÃO');
  });

  test('includes tutela de urgência analysis criteria', async () => {
    const prompt = await buildFiracEnterprisePrompt(baseInput);
    expect(prompt).toContain('Tutela de Urgência');
    expect(prompt).toContain('Probabilidade do direito');
    expect(prompt).toContain('perigo de dano');
    expect(prompt).toContain('reversibilidade');
  });
});
