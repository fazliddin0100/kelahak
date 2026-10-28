'use client';

import DocumentRenderer from '@/components/DocumentRenderer';
import { useDocumentById } from '@/hooks/useDocumentById';
import { useRoleHook } from '@/hooks/useRoleHook';
import { House, Link } from 'lucide-react';
import DocumentOpenButtons from './open-doc-amallar';

export default function DocumentClient({ documentId }: { documentId: string }) {
  const { document, error, refetch } = useDocumentById(documentId);
  const { role } = useRoleHook();

  const currentRole = Array.isArray(role) ? role[0] : role;

  if (error) {
    const dashboardPath =
      currentRole === 'admin' ? '/kotibiyat'
      : currentRole === 'user' ? '/user'
      : currentRole === 'commander' ? '/komandir'
      : '/';

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-red-600 text-xl sm:text-2xl font-medium">
            Xato: {error}
          </div>

          <Link
            href={dashboardPath}
            className={`
            inline-flex items-center justify-center gap-2
            bg-[#102c50] hover:bg-[#173c68] active:bg-[#0b213d]
            text-white font-medium
            px-6 py-3 rounded-md
            shadow-sm
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-[#c7a75b] focus:ring-offset-2
          `}>
            <House className="h-5 w-5" />
            Bosh sahifaga qaytish
          </Link>
        </div>
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
