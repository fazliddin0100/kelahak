'use client';

import { Button } from '@/components/ui/button';
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
import { Ban, ShieldBan, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import {
  SectionShell,
  adminTdClass,
  adminThClass,
} from '../navbar/shared';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WafAdminPage() {
  const { data, mutate, isLoading } = useSWR('/api/waf/ips', fetcher, {
    refreshInterval: 5000,
  });

  const blockIp = async (ip: string) => {
    await fetch('/api/waf/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    mutate();
  };

  const unblockIp = async (ip: string) => {
    await fetch('/api/waf/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    mutate();
  };

  const seen: string[] = data?.seen ?? [];
  const blocked: string[] = data?.blocked ?? [];

  return (
    <SectionShell
      title="IP-blocker"
      description="Tarmoq trafikini kuzatish va IP manzillarni bloklash"
      icon={ShieldBan}
      iconClassName="bg-red-500/10 text-red-600">
      <div className="p-5">
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
            Ko‘rilgan IP:{' '}
            <strong className="text-slate-800">{seen.length}</strong>
          </span>
          <span className="rounded-lg bg-red-50 px-3 py-1.5 text-red-700 ring-1 ring-red-100">
            Bloklangan:{' '}
            <strong>{blocked.length}</strong>
          </span>
        </div>

        {isLoading || !data ?
          <LoadingState fullScreen message="Xavfsizlik ma’lumotlari yuklanmoqda..." />
        : seen.length === 0 ?
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <ShieldCheck className="size-10 text-slate-300" />
            <p className="text-sm text-slate-500">Hozircha IP manzillar yo‘q</p>
          </div>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-320px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                    <TableHead className={`${adminThClass} w-12 text-center`}>
                      №
                    </TableHead>
                    <TableHead className={adminThClass}>IP manzil</TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Holat
                    </TableHead>
                    <TableHead className={`${adminThClass} text-center`}>
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seen.map((ip: string, index: number) => {
                    const isBlocked = blocked.includes(ip);
                    return (
                      <TableRow
                        key={ip}
                        className="border-slate-100 transition-colors hover:bg-sky-50/40">
                        <TableCell
                          className={`${adminTdClass} text-center font-medium`}>
                          {index + 1}
                        </TableCell>
                        <TableCell className={`${adminTdClass} font-mono text-sm`}>
                          {ip}
                        </TableCell>
                        <TableCell className={`${adminTdClass} text-center`}>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              isBlocked ?
                                'bg-red-100 text-red-700 ring-red-200'
                              : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                            )}>
                            {isBlocked ? 'Bloklangan' : 'Faol'}
                          </span>
                        </TableCell>
                        <TableCell className={`${adminTdClass} text-center`}>
                          {isBlocked ?
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              onClick={() => unblockIp(ip)}>
                              <ShieldCheck className="size-3.5" />
                              Blokdan chiqarish
                            </Button>
                          : <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => blockIp(ip)}>
                              <Ban className="size-3.5" />
                              Bloklash
                            </Button>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        }
      </div>
    </SectionShell>
  );
}
