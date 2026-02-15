import { useDocuments } from '@/hooks/useDocuments';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { UploadZone } from '@/components/dashboard/UploadZone';
import { DocumentTable } from '@/components/dashboard/DocumentTable';

export default function Dashboard() {
  const { data, isLoading } = useDocuments();
  const documents = data?.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-(--color-text)">Documentos</h2>
      </div>
      <StatsBar documents={documents} />
      <UploadZone />
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-(--color-primary) border-t-transparent rounded-full" />
        </div>
      ) : (
        <DocumentTable documents={documents} />
      )}
    </div>
  );
}
