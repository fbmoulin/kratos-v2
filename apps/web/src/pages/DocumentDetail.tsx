import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Play } from 'lucide-react';
import { useDocument } from '@/hooks/useDocuments';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useDocument(id!);
  const [analyzing, setAnalyzing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-(--color-primary) border-t-transparent rounded-full" />
      </div>
    );
  }

  const doc = data?.data;
  if (!doc) {
    return (
      <div className="p-6 text-center">
        <p className="text-(--color-text-secondary)">Documento não encontrado.</p>
        <Link to="/dashboard" className="text-(--color-primary) hover:underline mt-2 inline-block">Voltar ao Dashboard</Link>
      </div>
    );
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.documents.analyze(id!);
      refetch();
    } catch {
      // error handled by polling
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="p-2 hover:bg-(--color-surface-hover) rounded-lg">
          <ArrowLeft className="h-5 w-5 text-(--color-text-secondary)" />
        </Link>
        <h2 className="text-2xl font-bold text-(--color-text)">Detalhes do Documento</h2>
      </div>

      <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-(--color-primary)" />
            <div>
              <h3 className="text-lg font-semibold text-(--color-text)">{doc.fileName}</h3>
              <p className="text-sm text-(--color-text-secondary)">
                {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                {doc.pages && ` • ${doc.pages} páginas`}
              </p>
            </div>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-(--color-border)">
          <div>
            <span className="text-xs text-(--color-text-secondary) uppercase">Criado em</span>
            <p className="text-sm text-(--color-text)">{format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          <div>
            <span className="text-xs text-(--color-text-secondary) uppercase">Atualizado em</span>
            <p className="text-sm text-(--color-text)">{format(new Date(doc.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {doc.status === 'pending' && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-(--color-primary) to-(--color-primary-light) hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Play className="h-4 w-4" />
            {analyzing ? 'Iniciando...' : 'Iniciar Análise'}
          </button>
        )}
        {doc.status === 'completed' && (
          <Link
            to={`/documents/${doc.id}/review`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-(--color-primary) to-(--color-primary-light) hover:opacity-90 transition-opacity"
          >
            Revisar Análise
          </Link>
        )}
      </div>
    </div>
  );
}
