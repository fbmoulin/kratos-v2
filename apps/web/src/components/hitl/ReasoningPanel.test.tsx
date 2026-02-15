import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReasoningPanel } from './ReasoningPanel';
import { LegalMatter, DecisionType, AIModel } from '@kratos/core';

const mockFirac = {
  facts: 'O autor ingressou com ação de cobrança.',
  issue: 'Se houve inadimplemento contratual.',
  rule: 'Art. 389 do Código Civil.',
  analysis: 'Análise detalhada do caso.',
  conclusion: 'Procedente o pedido.',
};

const mockRouter = {
  legalMatter: LegalMatter.CIVIL,
  decisionType: DecisionType.SENTENCA,
  complexity: 45,
  confidence: 87,
  selectedModel: AIModel.CLAUDE_SONNET,
  reasoning: 'Standard civil case',
};

describe('ReasoningPanel', () => {
  test('renders FIRAC sections', () => {
    render(<ReasoningPanel firac={mockFirac} router={mockRouter} />);
    expect(screen.getByText('Raciocínio da IA')).toBeInTheDocument();
    expect(screen.getByText('Classificação')).toBeInTheDocument();
    expect(screen.getByText('Fatos (Facts)')).toBeInTheDocument();
  });

  test('renders agent chain', () => {
    render(<ReasoningPanel firac={null} router={null} agentChain="supervisor → router → rag → specialist" />);
    expect(screen.getByText('Cadeia de Agentes')).toBeInTheDocument();
  });
});
