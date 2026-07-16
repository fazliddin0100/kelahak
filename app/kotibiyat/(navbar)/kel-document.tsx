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
import { cn } from '@/lib/utils';
import { useGetDocumentsKotibiyat } from '@/hooks/useGetDocumentKotibiyat';
import NotData from '@/utils/not-data';
import dayjs from 'dayjs';
import { ClipboardCheck, Loader2, Search } from 'lucide-react';
import KotibiyatAmallarButtons from './amallar';
import { DocumentType } from '@/types/document';
import { SectionShell } from './section-shell';

const KelDocument = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { documents, province, loading, error } = useGetDocumentsKotibiyat();

  const filteredData = documents.filter((item: DocumentType) => {
    const q = searchQuery.toLowerCase();
    const author = item.author?.fullName ?? '';
    return (
      (item.title ?? '').toLowerCase().includes(q) ||
      author.toLowerCase().includes(q) ||
      (item.ownerRegion ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <SectionShell
      title="Ro‘yxatga olish uchun kelgan hujjatlar"
      description="Kotibiyat yaratgan hujjatlar va userlar kotibiyatga yuborgan hujjatlar — tekshirib ro‘yxatga oling"
      icon={ClipboardCheck}
      iconClassName="bg-emerald-500/10 text-emerald-600">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {province ?
              <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {province}
              </span>
            : null}
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
              placeholder="Hujjat nomi yoki muallif bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {loading ?
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-emerald-500" />
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
                      Hujjat nomi
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Muallif
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Komandir
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sana
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Holat
                    </TableHead>
                    <TableHead className="w-24 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ?
                    filteredData.map((item, index) => (
                      <TableRow
                        key={item._id}
                        className="border-slate-100 transition-colors hover:bg-emerald-50/40">
                        <TableCell className="text-center text-sm font-medium text-slate-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {item.title ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.author?.fullName ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm text-slate-600">
                          {item.forwardedSigner?.fullName ?? '—'}
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
                            ).format('DD.MM.YYYY HH:mm')
                          : '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                              'bg-emerald-100 text-emerald-700 ring-emerald-200'
                            )}>
                            Ro‘yxatga olishga tayyor
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <KotibiyatAmallarButtons document={item} />
                        </TableCell>
                      </TableRow>
                    ))
                  : <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <NotData />
                        <p className="mt-2 text-xs text-slate-400">
                          Hozircha ro‘yxatga olish uchun kelgan hujjat yo‘q
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
