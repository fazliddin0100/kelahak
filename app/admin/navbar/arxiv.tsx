'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Archive } from 'lucide-react';
import { SectionShell, adminTdClass, adminThClass } from './shared';

const arxivData = [
  {
    raqam: 1,
    nomi: 'Arxiv ishjildi A',
    hujjatlar: 25,
    muddat: '5 yil',
    javobgar: 'Aliyev A.',
    organ: 'Adliya vazirligi',
    viloyat: 'Navoiy',
    status: 'Faol',
  },
  {
    raqam: 2,
    nomi: 'Arxiv ishjildi B',
    hujjatlar: 40,
    muddat: '10 yil',
    javobgar: 'Karimov B.',
    organ: 'Moliya vazirligi',
    viloyat: 'Toshkent',
    status: 'Arxivda',
  },
  {
    raqam: 3,
    nomi: 'Arxiv ishjildi C',
    hujjatlar: 18,
    muddat: '3 yil',
    javobgar: 'Saidova D.',
    organ: "Ta'lim vazirligi",
    viloyat: 'Samarqand',
    status: 'Faol',
  },
];

const Arxiv = () => {
  return (
    <SectionShell
      title="Arxiv ishjildlari"
      description="Hujjatlar arxivi bo‘yicha ma’lumotlar bazasi"
      icon={Archive}
      iconClassName="bg-amber-500/10 text-amber-600">
      <div className="overflow-hidden rounded-b-xl border-t border-slate-100">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className={adminThClass}>№</TableHead>
                <TableHead className={adminThClass}>Ish jild nomi</TableHead>
                <TableHead className={`${adminThClass} text-center`}>
                  Hujjatlar
                </TableHead>
                <TableHead className={adminThClass}>Saqlash muddati</TableHead>
                <TableHead className={adminThClass}>Javobgar</TableHead>
                <TableHead className={adminThClass}>Organ</TableHead>
                <TableHead className={adminThClass}>Viloyat</TableHead>
                <TableHead className={`${adminThClass} text-center`}>
                  Holat
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arxivData.map((item) => (
                <TableRow
                  key={item.raqam}
                  className="border-slate-100 transition-colors hover:bg-sky-50/40">
                  <TableCell className={`${adminTdClass} font-medium`}>
                    {item.raqam}
                  </TableCell>
                  <TableCell className={`${adminTdClass} font-medium text-slate-800`}>
                    {item.nomi}
                  </TableCell>
                  <TableCell className={`${adminTdClass} text-center`}>
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                      {item.hujjatlar}
                    </span>
                  </TableCell>
                  <TableCell className={adminTdClass}>
                    <Badge
                      variant="outline"
                      className="border-amber-200 text-amber-700">
                      {item.muddat}
                    </Badge>
                  </TableCell>
                  <TableCell className={adminTdClass}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-indigo-100 text-xs text-indigo-700">
                          {item.javobgar.split(' ')[0]?.[0]}
                          {item.javobgar.split(' ')[1]?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      {item.javobgar}
                    </div>
                  </TableCell>
                  <TableCell className={adminTdClass}>{item.organ}</TableCell>
                  <TableCell className={adminTdClass}>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                      {item.viloyat}
                    </span>
                  </TableCell>
                  <TableCell className={`${adminTdClass} text-center`}>
                    <span
                      className={
                        item.status === 'Faol' ?
                          'inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200'
                        : 'inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200'
                      }>
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionShell>
  );
};

export default Arxiv;
