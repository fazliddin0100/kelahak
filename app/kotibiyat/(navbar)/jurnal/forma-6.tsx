'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileStack } from 'lucide-react';
import {
  JurnalSectionHeader,
  JurnalTableShell,
  JurnalViewButton,
  jurnalTdClass,
  jurnalThClass,
} from './shared';

const MOCK_ROWS = [
  {
    raqam: '001',
    regRaqam: 'REG-2025/001',
    sana: '10.12.2025',
    mazmun: 'Shartnoma',
    tayyorlagan: 'Dilshod',
    nusxalar: '2',
    nusxaRaqam: '1-nusxa',
    manzil: 'Toshkent',
    imzo: 'Imzolangan',
  },
  {
    raqam: '002',
    regRaqam: 'REG-2025/002',
    sana: '11.12.2025',
    mazmun: 'Buyruq loyihasi',
    tayyorlagan: 'Akmal',
    nusxalar: '1',
    nusxaRaqam: 'Asl nusxa',
    manzil: 'Samarqand',
    imzo: 'Kutilmoqda',
  },
];

const Forma6 = () => {
  return (
    <div className="w-full">
      <JurnalSectionHeader
        title="Buyruqlar"
        description="Forma 6 — buyruqlar jurnali"
        icon={FileStack}
        count={MOCK_ROWS.length}
      />

      <JurnalTableShell>
        <Table className="min-w-max w-full">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className={jurnalThClass}>Raqami</TableHead>
              <TableHead className={jurnalThClass}>
                Ro&apos;yxatga olingan
              </TableHead>
              <TableHead className={jurnalThClass}>Sana</TableHead>
              <TableHead className={jurnalThClass}>Mazmun</TableHead>
              <TableHead className={jurnalThClass}>Tayyorlagan</TableHead>
              <TableHead className={jurnalThClass}>Nusxalar</TableHead>
              <TableHead className={jurnalThClass}>Nusxa raqami</TableHead>
              <TableHead className={jurnalThClass}>Manzil</TableHead>
              <TableHead className={jurnalThClass}>Imzo</TableHead>
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
                <TableCell className={`${jurnalTdClass} font-medium`}>
                  {row.raqam}
                </TableCell>
                <TableCell className={jurnalTdClass}>{row.regRaqam}</TableCell>
                <TableCell className={`${jurnalTdClass} whitespace-nowrap`}>
                  {row.sana}
                </TableCell>
                <TableCell className={jurnalTdClass}>{row.mazmun}</TableCell>
                <TableCell className={jurnalTdClass}>{row.tayyorlagan}</TableCell>
                <TableCell className={`${jurnalTdClass} text-center`}>
                  {row.nusxalar}
                </TableCell>
                <TableCell className={jurnalTdClass}>{row.nusxaRaqam}</TableCell>
                <TableCell className={jurnalTdClass}>{row.manzil}</TableCell>
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

export default Forma6;
