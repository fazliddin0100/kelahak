'use client';

import { useDocumentById } from '@/hooks/useDocumentById';
import DocumentRenderer from '@/components/DocumentRenderer';
import DocumentOpenButtons from './open-doc-amallar';

export default function DocumentClient({ documentId }: { documentId: string }) {
  const { document, error, refetch } = useDocumentById(documentId);

  if (error) {
    return (
      <div className="p-10 bg-gray-100 min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-600">Xato: {error}</div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-10 bg-gray-100 min-h-screen flex items-center justify-center">
        <div>Hujjat topilmadi</div>
      </div>
    );
  }

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <div
        className={
          'w-full pr-[120px] flex items-center justify-end gap-4 fixed z-100'
        }>

        <DocumentOpenButtons document={document} />
      </div>
      <div className="max-w-[210mm] min-h-[297mm] mx-auto">
        <DocumentRenderer document={document} />
      </div>
    </div>
  );
}
