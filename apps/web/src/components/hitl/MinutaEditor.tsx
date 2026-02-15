import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

interface MinutaEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export function MinutaEditor({ initialContent, onChange }: MinutaEditorProps) {
  const [content, setContent] = useState(initialContent);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onChange(e.target.value);
  }, [onChange]);

  const handleReset = useCallback(() => {
    setContent(initialContent);
    onChange(initialContent);
  }, [initialContent, onChange]);

  return (
    <div className="space-y-2" data-testid="minuta-editor">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-(--color-text)">Minuta</h3>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-(--color-text-secondary) hover:text-(--color-text) bg-(--color-surface) hover:bg-(--color-surface-hover) border border-(--color-border) rounded-lg transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Resetar
        </button>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="w-full h-96 px-4 py-3 bg-(--color-bg) border border-(--color-border) rounded-xl text-sm text-(--color-text) font-mono resize-y focus:outline-none focus:border-(--color-primary)"
        placeholder="Conteúdo da minuta gerada pela IA..."
      />
      <p className="text-xs text-(--color-text-secondary)">
        {content.length} caracteres • Edite livremente antes de aprovar
      </p>
    </div>
  );
}
