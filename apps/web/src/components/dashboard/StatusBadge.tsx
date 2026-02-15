import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  processing: { label: 'Processando', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Concluído', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  reviewed: { label: 'Revisado', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  failed: { label: 'Erro', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', config.className)}>
      {status === 'processing' && <span className="mr-1 h-2 w-2 rounded-full bg-blue-400 animate-pulse" />}
      {config.label}
    </span>
  );
}
