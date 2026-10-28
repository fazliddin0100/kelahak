'use client';

import { useState } from 'react';
import LoadingState from '@/components/LoadingState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useKelganDocuments } from '@/hooks/useKelganDocuments';
import NotData from '@/utils/not-data';
import dayjs from 'dayjs';
import { Inbox, Search } from 'lucide-react';
import AmallarButtons from './amallar';
import { DocumentType } from '@/types/document';
import { SectionShell } from './section-shell';

const KelDocument = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { documents, loading, error } = useKelganDocuments();

  const filteredData = documents.filter((item: DocumentType) =>
    (item.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SectionShell
      title="Kelgan hujjatlar"
      description="Boshqa viloyatdan kotibiyat tomonidan yuborilgan hujjatlar — izoh, navbat va imzo"
      icon={Inbox}
      iconClassName="bg-sky-500/10 text-sky-600">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Jami:{' '}
            <span className="font-semibold text-slate-800">
              {filteredData.length}
            </span>{' '}
            ta hujjat
          </p>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Hujjat nomi bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {loading ?
          <LoadingState fullScreen message="Kiruvchi hujjatlar yuklanmoqda..." />
        : error ?
          <div className="flex h-64 items-center justify-center text-red-500">
            {error}
          </div>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-280px)] min-h-[320px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                    <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      №
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hujjat nomi
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sana
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Holat
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Navbat
                    </TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ?
                    filteredData.map((item, index) => {
                      const queue = Array.isArray(item.forwardedTo) ?
                        item.forwardedTo
                      : [];
                      const queueCount = queue.length;

                      return (
                        <TableRow
                          key={item._id}
                          className="border-slate-100 transition-colors hover:bg-sky-50/40">
                          <TableCell className="text-center text-sm font-medium text-slate-500">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {item.title ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            {item.createdAt ?
                              dayjs(
                                (
                                  typeof item.createdAt === 'object' &&
                                  item.createdAt &&
                                  '$date' in item.createdAt
                                ) ?
                                  (item.createdAt as { $date: string }).$date
                                : item.createdAt
                              ).format('DD.MM.YYYY')
                            : '—'}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                                item.status === 'in_progress_forward' ?
                                  'bg-violet-100 text-violet-700 ring-violet-200'
                                : 'bg-sky-100 text-sky-700 ring-sky-200'
                              )}>
                              {item.status ?? 'yangi'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {queueCount > 0 ?
                              `${queueCount} kishi`
                            : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <AmallarButtons document={item} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  : <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <NotData />
                        <p className="mt-2 text-xs text-slate-400">
                          Kelgan hujjat topilmadi
                        </p>
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          </div>
        }
      </div>
    </SectionShell>
  );
};

export default KelDocument;
