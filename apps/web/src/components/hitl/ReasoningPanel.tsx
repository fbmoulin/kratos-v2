import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Cpu, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FIRACResult, RouterResult } from '@kratos/core';

interface ReasoningPanelProps {
  firac: FIRACResult | null;
  router: RouterResult | null;
  agentChain?: string;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-(--color-border) rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-(--color-surface) hover:bg-(--color-surface-hover) transition-colors text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-(--color-text-secondary)" /> : <ChevronRight className="h-4 w-4 text-(--color-text-secondary)" />}
        <Icon className="h-4 w-4 text-(--color-primary)" />
        <span className="text-sm font-medium text-(--color-text)">{title}</span>
      </button>
      {open && <div className="px-4 py-3 bg-(--color-bg-alt) text-sm text-(--color-text)">{children}</div>}
    </div>
  );
}

export function ReasoningPanel({ firac, router, agentChain }: ReasoningPanelProps) {
  return (
    <div className="space-y-3" data-testid="reasoning-panel">
      <h3 className="text-lg font-semibold text-(--color-text)">Raciocínio da IA</h3>

      {router && (
        <CollapsibleSection title="Classificação" icon={BarChart3} defaultOpen>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-(--color-text-secondary)">Matéria:</span>
              <span className="font-medium">{router.legalMatter}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--color-text-secondary)">Tipo de decisão:</span>
              <span className="font-medium">{router.decisionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--color-text-secondary)">Complexidade:</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-(--color-border) rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', router.complexity > 70 ? 'bg-red-500' : router.complexity > 40 ? 'bg-yellow-500' : 'bg-green-500')}
                    style={{ width: `${router.complexity}%` }}
                  />
                </div>
                <span className="font-medium">{router.complexity}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-(--color-text-secondary)">Modelo:</span>
              <span className="font-mono text-xs">{router.selectedModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--color-text-secondary)">Confiança:</span>
              <span className="font-medium">{router.confidence}%</span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {firac && (
        <>
          <CollapsibleSection title="Fatos (Facts)" icon={Brain} defaultOpen>
            <p className="whitespace-pre-wrap">{firac.facts}</p>
          </CollapsibleSection>
          <CollapsibleSection title="Questão (Issue)" icon={Brain}>
            <p className="whitespace-pre-wrap">{firac.issue}</p>
          </CollapsibleSection>
          <CollapsibleSection title="Regra (Rule)" icon={Brain}>
            <p className="whitespace-pre-wrap">{firac.rule}</p>
          </CollapsibleSection>
          <CollapsibleSection title="Análise (Analysis)" icon={Brain}>
            <p className="whitespace-pre-wrap">{firac.analysis}</p>
          </CollapsibleSection>
          <CollapsibleSection title="Conclusão (Conclusion)" icon={Brain}>
            <p className="whitespace-pre-wrap">{firac.conclusion}</p>
          </CollapsibleSection>
        </>
      )}

      {agentChain && (
        <CollapsibleSection title="Cadeia de Agentes" icon={Cpu}>
          <div className="flex flex-wrap gap-2">
            {agentChain.split('→').map((agent, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-(--color-text-secondary)">→</span>}
                <span className="px-2 py-1 bg-(--color-surface) border border-(--color-border) rounded text-xs font-mono">
                  {agent.trim()}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
