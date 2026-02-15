import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDocument } from '@/hooks/useDocuments';
import { useReview } from '@/hooks/useReview';
import { ReasoningPanel } from '@/components/hitl/ReasoningPanel';
import { DiffViewer } from '@/components/hitl/DiffViewer';
import { MinutaEditor } from '@/components/hitl/MinutaEditor';
import { ApprovalBar } from '@/components/hitl/ApprovalBar';
import type { FIRACResult, RouterResult } from '@kratos/core';

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDocument(id!);
  const review = useReview(id!);
  const [editedContent, setEditedContent] = useState('');

  const doc = data?.data;
  const analysis = data?.analysis;

  // Extract FIRAC and router results from analysis
  const firac: FIRACResult | null = analysis?.resultJson?.firac as FIRACResult ?? null;
  const router: RouterResult | null = analysis?.resultJson?.router as RouterResult ?? null;
  const originalText = analysis?.resultJson?.rawText as string ?? '';
  const draftContent = analysis?.resultJson?.draft as string ?? '';
  const agentChain = analysis?.agentChain ?? '';

  const handleAction = useCallback((action: string) => (comments: string) => {
    review.mutate(
      {
        action,
        comments,
        ...(action === 'revised' && editedContent ? { revisedContent: { draft: editedContent } } : {}),
      },
      { onSuccess: () => navigate(`/documents/${id}`) },
    );
  }, [review, editedContent, id, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-(--color-primary) border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!doc || !analysis) {
    return (
      <div className="p-6 text-center">
        <p className="text-(--color-text-secondary)">Análise não encontrada.</p>
        <Link to="/dashboard" className="text-(--color-primary) hover:underline mt-2 inline-block">Voltar ao Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-(--color-border)">
        <Link to={`/documents/${id}`} className="p-2 hover:bg-(--color-surface-hover) rounded-lg">
          <ArrowLeft className="h-5 w-5 text-(--color-text-secondary)" />
        </Link>
        <h2 className="text-xl font-bold text-(--color-text)">Revisão: {doc.fileName}</h2>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="lg:col-span-1 space-y-4 overflow-auto max-h-[calc(100vh-16rem)]">
            <ReasoningPanel firac={firac} router={router} agentChain={agentChain} />
          </div>
          <div className="lg:col-span-1">
            <DiffViewer
              originalText={originalText}
              analysisText={firac ? `${firac.facts}\n\n${firac.issue}\n\n${firac.rule}\n\n${firac.analysis}\n\n${firac.conclusion}` : ''}
              title="Comparação"
            />
          </div>
          <div className="lg:col-span-1">
            <MinutaEditor
              initialContent={draftContent}
              onChange={setEditedContent}
            />
          </div>
        </div>
      </div>

      <ApprovalBar
        onApprove={handleAction('approved')}
        onRevise={handleAction('revised')}
        onReject={handleAction('rejected')}
        isSubmitting={review.isPending}
      />
    </div>
  );
}
