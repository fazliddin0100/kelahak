'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Inbox } from 'lucide-react';
import {
  JurnalSectionHeader,
  JurnalTableShell,
  JurnalViewButton,
  jurnalTdClass,
  jurnalThClass,
} from './shared';

const MOCK_ROWS = [
  {
    regRaqam: 'KEL-2025/014',
    sana: '10.12.2025',
    muallif: 'Dilshod',
    nomi: 'Shartnoma',
    joy: 'Toshkent',
    yuborilgan: '09.12.2025',
    qabul: 'Akmal',
    imzo: 'Imzolangan',
    nomeklatura: 'NX-2025',
  },
  {
    regRaqam: 'KEL-2025/015',
    sana: '11.12.2025',
    muallif: 'Sardor',
    nomi: 'Ma’lumotnoma',
    joy: 'Samarqand',
    yuborilgan: '10.12.2025',
    qabul: '—',
    imzo: 'Kutilmoqda',
    nomeklatura: 'NX-2026',
  },
];

const KelganHujjatlar = () => {
  return (
    <div className="w-full">
      <JurnalSectionHeader
        title="Kelgan hujjatlar"
        description="Tashqi manbalardan kelgan hujjatlar jurnali"
        icon={Inbox}
        count={MOCK_ROWS.length}
      />

      <JurnalTableShell>
        <Table className="min-w-max w-full">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className={jurnalThClass}>Reg/Raqam</TableHead>
              <TableHead className={jurnalThClass}>Sana</TableHead>
              <TableHead className={jurnalThClass}>Muallif</TableHead>
              <TableHead className={jurnalThClass}>Nomi</TableHead>
              <TableHead className={jurnalThClass}>Yuborilgan joy</TableHead>
              <TableHead className={jurnalThClass}>Yuborilgan sana</TableHead>
              <TableHead className={jurnalThClass}>Qabul qilgan</TableHead>
              <TableHead className={jurnalThClass}>Imzo</TableHead>
              <TableHead className={jurnalThClass}>Nomeklatura</TableHead>
              <TableHead className={`${jurnalThClass} text-center`}>
                Ko‘rish
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {MOCK_ROWS.map((row, index) => (
              <TableRow
                key={index}
                className="border-slate-100 transition-colors hover:bg-sky-50/40">
                <TableCell className={`${jurnalTdClass} font-medium text-slate-800`}>
                  {row.regRaqam}
                </TableCell>
                <TableCell className={`${jurnalTdClass} whitespace-nowrap`}>
                  {row.sana}
                </TableCell>
                <TableCell className={jurnalTdClass}>{row.muallif}</TableCell>
                <TableCell className={jurnalTdClass}>{row.nomi}</TableCell>
                <TableCell className={jurnalTdClass}>{row.joy}</TableCell>
                <TableCell className={`${jurnalTdClass} whitespace-nowrap`}>
                  {row.yuborilgan}
                </TableCell>
                <TableCell className={jurnalTdClass}>
                  {row.qabul === '—' ?
                    <span className="text-xs text-amber-600">Kutilmoqda</span>
                  : row.qabul}
                </TableCell>
                <TableCell className={jurnalTdClass}>
                  <span
                    className={
                      row.imzo === 'Imzolangan' ?
                        'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200'
                      : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200'
                    }>
                    {row.imzo}
                  </span>
                </TableCell>
                <TableCell className={jurnalTdClass}>{row.nomeklatura}</TableCell>
                <TableCell className={`${jurnalTdClass} text-center`}>
                  <div className="flex justify-center">
                    <JurnalViewButton />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </JurnalTableShell>
    </div>
  );
};

export default KelganHujjatlar;
