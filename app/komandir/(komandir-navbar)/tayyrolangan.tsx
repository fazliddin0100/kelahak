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
import {
  CheckCircle2,
  ClipboardList,
  Search,
  XCircle,
} from 'lucide-react';
import { useCommanderLocalDocuments } from '@/hooks/useCommanderLocalDocuments';
import NotData from '@/utils/not-data';
import AmallarButtons from './amallar';
import { DocumentType } from '@/types/document';
import { SectionShell } from './section-shell';

export default function Tayyrolangan() {
  const [searchQuery, setSearchQuery] = useState('');
  const { documents, loading, error } = useCommanderLocalDocuments();

  const filteredData = documents.filter((item: DocumentType) =>
    (item.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SectionShell
      title="Tayyorlangan hujjatlar"
      description="User yaratgan va komandir ko‘rib chiqishi kerak bo‘lgan hujjatlar"
      icon={ClipboardList}
      iconClassName="bg-indigo-500/10 text-indigo-600">
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
          <LoadingState fullScreen message="Hujjatlar yuklanmoqda..." />
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
                      Reg/Raqami
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Imzolanganligi
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
                        className="border-slate-100 transition-colors hover:bg-sky-50/40">
                        <TableCell className="text-center text-sm font-medium text-slate-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {item.title ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.ownerRegion ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              item.bosSigned?.hasSigned ?
                                'bg-emerald-100 text-emerald-700 ring-emerald-200'
                              : 'bg-amber-100 text-amber-700 ring-amber-200'
                            )}>
                            {item.bosSigned?.hasSigned ?
                              <>
                                <CheckCircle2 className="size-3.5" />
                                Imzolangan
                              </>
                            : <>
                                <XCircle className="size-3.5" />
                                Imzolanmagan
                              </>
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <AmallarButtons document={item} />
                        </TableCell>
                      </TableRow>
                    ))
                  : <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <NotData />
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
}
