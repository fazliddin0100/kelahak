import { useState } from 'react';
import LoadingState from '@/components/LoadingState';
import { useDocuments } from '@/hooks/useDocuments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  FileText,
  Hash,
  Search,
  Tag,
} from 'lucide-react';
import NotData from '@/utils/not-data';
import DocumentProgress from '@/components/DocumentProgress';
import DeleteDraftButton from '@/components/DeleteDraftButton';
import { ErrorState } from '@/components/EmptyState';
import { toDate } from '@/lib/dateLike';
import AmallarButtons from './amallar';


const DocumentTable = ({ userId }: { userId?: string }) => {
  const [search, setSearch] = useState('');
  const { documents, loading, error, refetch } = useDocuments(userId, { scope: 'owner' });

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.copyNumber?.join(',').toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return <LoadingState fullScreen message="Hujjatlar yuklanmoqda..." />;

  if (error)
    return (
      <ErrorState onRetry={refetch} />
    );

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Jami:{' '}
          <span className="font-semibold text-slate-800">
            {filteredDocuments.length}
          </span>{' '}
          ta hujjat
        </p>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Nomi yoki Reg/raqam bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/30"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-[calc(100vh-380px)] min-h-[320px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  №
                </TableHead>
                <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FileText className="mx-auto size-4" />
                </TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nomi
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Hash className="size-3.5" /> Reg/Raqam
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" /> Sana
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="size-3.5" /> Qayerda
                  </span>
                </TableHead>
                <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amal
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredDocuments.length > 0 ?
                filteredDocuments.map((doc, index) => (
                  <TableRow
                    key={doc._id || index}
                    className="border-slate-100 transition-colors hover:bg-primary-soft/60">
                    <TableCell className="text-center text-sm font-medium text-slate-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto flex size-8 items-center justify-center rounded-lg bg-sky-500/10">
                        <FileText className="size-4 text-sky-600" />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate font-medium text-slate-800">
                      {doc.title || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {doc.registrationIndex || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">
                      {doc.createdAt ?
                        toDate(doc.createdAt).toLocaleDateString('uz-UZ')
                      : '—'}
                    </TableCell>
                    <TableCell>
                      <DocumentProgress document={doc} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <AmallarButtons document={doc} />
                        <DeleteDraftButton document={doc} onDeleted={refetch} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
            </TableBody>
          </Table>
          {filteredDocuments.length === 0 && (
            <div className="sticky left-0 w-full">
              {search ?
                        <NotData
                          title="Hech narsa topilmadi"
                          description="Qidiruv so'zini o'zgartirib ko'ring."
                        />
                      : <NotData />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentTable;
