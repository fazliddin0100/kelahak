'use client';

import { useDocumentById } from '@/hooks/useDocumentById';
import { House } from 'lucide-react';
import DocumentRenderer from '@/components/DocumentRenderer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRoleHook } from '@/hooks/useRoleHook';
import DocumentOpenButtons from './open-doc-amallar';

export default function DocumentClient({ documentId }: { documentId: string }) {
  const { document, error, refetch } = useDocumentById(documentId);
  const { role } = useRoleHook();

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

  const currentRole = Array.isArray(role) ? role[0] : role;

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <div
        className={
          'w-full pr-[120px] flex items-center justify-end gap-4 fixed z-100'
        }>
        <Link
          href={
            currentRole === 'admin'
              ? '/kotibiyat'
              : currentRole === 'user'
              ? '/user'
              : currentRole === 'commander'
              ? '/komandir'
              : '/'
          }>
          <Button className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
            <House className="w-4 h-4" />
            Bosh sahifa
          </Button>
        </Link>
        <DocumentOpenButtons document={document} />
      </div>
      <div className="max-w-[210mm] min-h-[297mm] mx-auto">
        <DocumentRenderer document={document} />
      </div>
    </div>
  );
}
