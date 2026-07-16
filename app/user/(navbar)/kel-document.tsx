'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForwardedInbox } from '@/hooks/useForwardedInbox';
import NotData from '@/utils/not-data';
import dayjs from 'dayjs';
import { Inbox, Loader2, Search } from 'lucide-react';
import AmallarButtons from './amallar';
import { DocumentType } from '@/types/document';
import { SectionShell } from './section-shell';

const KelDocument = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { documents, loading, error } = useForwardedInbox();

  const filteredData = documents.filter((item: DocumentType) =>
    (item.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SectionShell
      title="Kelgan hujjatlar"
      description="Komandir sizni ko‘rib chiqish navbatiga qo‘ygan hujjatlar — ijroga tasdiqlash (imzo)"
      icon={Inbox}
      iconClassName="bg-violet-500/10 text-violet-600">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Navbatdagi:{' '}
            <span className="font-semibold text-slate-800">
              {filteredData.length}
            </span>{' '}
            ta
          </p>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Hujjat nomi bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        {loading ?
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-violet-500" />
          </div>
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
                      Hujjat
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sana
                    </TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ?
                    filteredData.map((item, index) => (
                      <TableRow
                        key={item._id}
                        className="border-slate-100 transition-colors hover:bg-violet-50/40">
                        <TableCell className="text-center text-sm text-slate-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {item.title ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-slate-600">
                          {item.updatedAt ?
                            dayjs(
                              (
                                typeof item.updatedAt === 'object' &&
                                item.updatedAt &&
                                '$date' in item.updatedAt
                              ) ?
                                (item.updatedAt as { $date: string }).$date
                              : item.updatedAt
                            ).format('DD.MM.YYYY')
                          : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <AmallarButtons document={item} />
                        </TableCell>
                      </TableRow>
                    ))
                  : <TableRow>
                      <TableCell colSpan={4} className="py-16 text-center">
                        <NotData />
                        <p className="mt-2 text-xs text-slate-400">
                          Navbatdagi hujjat yo‘q
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
