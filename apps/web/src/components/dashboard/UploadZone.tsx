import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useUploadDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

export function UploadZone() {
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadDocument();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter((f) => f.type === 'application/pdf')
      .forEach((f) => upload.mutate(f));
  }, [upload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
        dragOver ? 'border-(--color-primary) bg-(--color-primary)/5' : 'border-(--color-border) hover:border-(--color-primary)/50',
      )}
    >
      <input
        type="file" accept=".pdf" multiple className="hidden" id="file-upload"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className={cn('h-8 w-8 mx-auto mb-3', dragOver ? 'text-(--color-primary)' : 'text-(--color-text-secondary)')} />
        <p className="text-(--color-text) font-medium">
          {upload.isPending ? 'Enviando...' : 'Arraste PDFs aqui ou clique para selecionar'}
        </p>
        <p className="text-sm text-(--color-text-secondary) mt-1">Apenas arquivos PDF, máximo 50MB</p>
      </label>
      {upload.isError && <p className="text-sm text-(--color-error) mt-2">Erro no upload: {upload.error.message}</p>}
    </div>
  );
}
