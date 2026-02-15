import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Document } from '@kratos/core';

interface StatsBarProps {
  documents: Document[];
}

export function StatsBar({ documents }: StatsBarProps) {
  const total = documents.length;
  const processing = documents.filter((d) => d.status === 'processing').length;
  const completed = documents.filter((d) => d.status === 'completed').length;
  const failed = documents.filter((d) => d.status === 'failed').length;

  const stats = [
    { label: 'Total', value: total, icon: FileText, color: 'text-(--color-primary)' },
    { label: 'Processando', value: processing, icon: Loader2, color: 'text-blue-400' },
    { label: 'Concluídos', value: completed, icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Erros', value: failed, icon: AlertCircle, color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-(--color-text-secondary)">{label}</span>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-(--color-text) mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}
