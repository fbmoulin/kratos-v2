import { useState } from 'react';
import { Check, Edit3, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalBarProps {
  onApprove: (comments: string) => void;
  onRevise: (comments: string) => void;
  onReject: (comments: string) => void;
  onExport?: () => void;
  isSubmitting: boolean;
  showExport?: boolean;
}

export function ApprovalBar({ onApprove, onRevise, onReject, onExport, isSubmitting, showExport }: ApprovalBarProps) {
  const [comments, setComments] = useState('');

  return (
    <div className="border-t border-(--color-border) bg-(--color-surface) p-4 space-y-3" data-testid="approval-bar">
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Comentários sobre a revisão (opcional)..."
        className="w-full px-3 py-2 bg-(--color-bg) border border-(--color-border) rounded-lg text-sm text-(--color-text) focus:outline-none focus:border-(--color-primary) resize-none h-20"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={() => onApprove(comments)}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-opacity',
            'bg-green-600 hover:bg-green-700 disabled:opacity-50',
          )}
        >
          <Check className="h-4 w-4" />
          Aprovar
        </button>
        <button
          onClick={() => onRevise(comments)}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 transition-opacity"
        >
          <Edit3 className="h-4 w-4" />
          Revisar
        </button>
        <button
          onClick={() => onReject(comments)}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-opacity"
        >
          <X className="h-4 w-4" />
          Rejeitar
        </button>
        {showExport && onExport && (
          <button
            onClick={onExport}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-(--color-text) bg-(--color-surface-hover) hover:bg-(--color-border) border border-(--color-border) transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar DOCX
          </button>
        )}
      </div>
    </div>
  );
}
