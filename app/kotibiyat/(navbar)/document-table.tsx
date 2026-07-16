import { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Calendar,
  FileText,
  Hash,
  Loader2,
  Search,
  Tag,
} from 'lucide-react';
import NotData from '@/utils/not-data';
import { toDate } from '@/lib/dateLike';
import AmallarButtons from './amallar';

const statusStyles: Record<string, string> = {
  yangi: 'bg-sky-100 text-sky-700 ring-sky-200',
  created: 'bg-sky-100 text-sky-700 ring-sky-200',
  signed: 'bg-amber-100 text-amber-700 ring-amber-200',
  registered: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  imzolandi: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  'rad etildi': 'bg-red-100 text-red-700 ring-red-200',
  arxivlangan: 'bg-slate-100 text-slate-600 ring-slate-200',
  forwarded: 'bg-violet-100 text-violet-700 ring-violet-200',
};

const DocumentTable = ({ userId }: { userId?: string }) => {
  const [search, setSearch] = useState('');
  const { documents, loading, error } = useDocuments(userId, { scope: 'owner' });

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.copyNumber?.join(',').toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-sky-500" />
      </div>
    );

  if (error)
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        <NotData />
      </div>
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
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
                    <Tag className="size-3.5" /> Holat
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
                    className="border-slate-100 transition-colors hover:bg-sky-50/40">
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
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                          statusStyles[doc.status ?? ''] ??
                            'bg-slate-100 text-slate-600 ring-slate-200'
                        )}>
                        {doc.status ?? 'nomaʼlum'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AmallarButtons document={doc} />
                    </TableCell>
                  </TableRow>
                ))
              : <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <NotData />
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DocumentTable;
