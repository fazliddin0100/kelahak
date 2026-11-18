'use client';

import DocumentViewStack from '@/components/DocumentViewStack';
import LoadingState from '@/components/LoadingState';
import { useDocumentById } from '@/hooks/useDocumentById';
import { useRoleHook } from '@/hooks/useRoleHook';
import { useTashkilot } from '@/hooks/useTashkilot';
import { cn } from '@/lib/utils';
import mexonLogo from '@/public/mexon-mark.png';
import { DocumentStatus } from '@/types/document-status.enum';
import StatusBadge from '@/components/StatusBadge';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  DocumentOpenSidebar,
  DocumentOpenToolbar,
} from './open-doc-amallar';

type Role = 'admin' | 'user' | 'commander' | null;

const roleRoutes: Record<string, string> = {
  admin: '/kotibiyat',
  user: '/user',
  commander: '/komandir',
};

const getHomeRoute = (role: Role): string => {
  if (!role) return '/';
  return roleRoutes[role] ?? '/';
};


export default function DocumentClient({ documentId }: { documentId: string }) {
  const searchParams = useSearchParams();
  const viewFrom = searchParams.get('from');
  const { document, error, refetch } = useDocumentById(documentId);
  const { role, loading } = useRoleHook();
  const { data: tashkilotData } = useTashkilot();

  const currentRole: Role = Array.isArray(role) ? role[0] : role;

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Hujjat yuklanmoqda..."
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="size-10 text-red-500" />
          <p className="text-base font-semibold text-red-600">{error}</p>
          <Link
            href={getHomeRoute(currentRole)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-primary-hover">
            <ArrowLeft className="size-4" />
            Bosh sahifa
          </Link>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <FileText className="mx-auto mb-3 size-10 text-slate-400" />
          <p className="font-medium text-slate-600">Hujjat topilmadi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary p-1.5">
              <Image
                src={mexonLogo}
                alt="Mezon"
                width={56}
                height={36}
                className="image_navbar360 rounded-sm object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {tashkilotData?.organ ?
                  tashkilotData.organ.charAt(0).toUpperCase() +
                  tashkilotData.organ.slice(1)
                : 'Hujjat ko‘rish'}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                  <Eye className="size-3.5 shrink-0" />
                  {document.title || 'Hujjat'}
                </p>
                {document.status && (
                  <StatusBadge status={document.status} className="px-2 text-[10px]" />
                )}
                {document.grif && (
                  <span className="text-[10px] text-slate-500">
                    Grif: {document.grif}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DocumentOpenToolbar
            document={document}
            onRefresh={refetch}
            viewFrom={viewFrom}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <main className="min-h-0 flex-1 overflow-auto bg-white">
          <div className="flex justify-center px-4 py-8 sm:px-8">
            <DocumentViewStack document={document} />
          </div>
        </main>

        <div className="shrink-0 lg:h-full">
          <DocumentOpenSidebar document={document} onRefresh={refetch} />
        </div>
      </div>
    </div>
  );
}
