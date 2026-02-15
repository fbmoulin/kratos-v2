import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge } from './StatusBadge';
import type { Document } from '@kratos/core';

interface DocumentTableProps {
  documents: Document[];
}

export function DocumentTable({ documents }: DocumentTableProps) {
  if (documents.length === 0) {
    return <p className="text-center text-(--color-text-secondary) py-8">Nenhum documento encontrado.</p>;
  }

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--color-border)">
            <th className="px-4 py-3 text-left text-xs font-medium text-(--color-text-secondary) uppercase">Nome</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--color-text-secondary) uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--color-text-secondary) uppercase">Data</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-(--color-text-secondary) uppercase">Ações</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b border-(--color-border) last:border-0 hover:bg-(--color-surface-hover) transition-colors">
              <td className="px-4 py-3 text-sm text-(--color-text)">{doc.fileName}</td>
              <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
              <td className="px-4 py-3 text-sm text-(--color-text-secondary)">
                {format(new Date(doc.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </td>
              <td className="px-4 py-3 text-right">
                <Link to={`/documents/${doc.id}`} className="inline-flex items-center gap-1 text-sm text-(--color-primary) hover:underline">
                  <Eye className="h-4 w-4" /> Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
