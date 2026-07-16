'use client';

import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  Ban,
  Globe,
  Loader2,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { SaSectionShell } from './shared';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('fetch failed');
    return r.json();
  });

const TYPE_LABELS: Record<string, string> = {
  visit: 'Tashrif',
  login_failed: 'Noto‘g‘ri login',
  login_success: 'Muvaffaq login',
  rate_limit: 'Rate limit',
  suspicious: 'Shubhali',
  waf_block: 'IP blok',
  ddos: 'DDoS',
};

const TYPE_CLASS: Record<string, string> = {
  visit: 'bg-slate-100 text-slate-700 ring-slate-200',
  login_failed: 'bg-red-100 text-red-800 ring-red-200',
  rate_limit: 'bg-amber-100 text-amber-800 ring-amber-200',
  suspicious: 'bg-orange-100 text-orange-800 ring-orange-200',
  ddos: 'bg-red-200 text-red-900 ring-red-300',
  waf_block: 'bg-violet-100 text-violet-800 ring-violet-200',
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SuperAdminSecurity() {
  const [tab, setTab] = useState<'events' | 'ips'>('events');
  const [filterType, setFilterType] = useState('');

  const { data: stats, isLoading: statsLoading } = useSWR(
    '/api/superadmin/security/stats?hours=24',
    fetcher,
    { refreshInterval: 15000 }
  );

  const logsUrl = filterType
    ? `/api/superadmin/security/logs?limit=250&type=${filterType}`
    : '/api/superadmin/security/logs?limit=250';

  const { data: logsData, isLoading: logsLoading } = useSWR(logsUrl, fetcher, {
    refreshInterval: 8000,
  });

  const { data: wafData, mutate: mutateWaf, isLoading: wafLoading } = useSWR(
    '/api/waf/ips',
    fetcher,
    { refreshInterval: 5000 }
  );

  const logs = logsData?.logs ?? [];
  const activeFilter = logsData?.filter ?? (filterType || null);
  const seen: string[] = wafData?.seen ?? [];
  const blocked: string[] = wafData?.blocked ?? [];

  /** Bloklangan IP lar ham ro‘yxatda chiqsin (faqat seen da bo‘lmasa ham) */
  const allManagedIps = useMemo(
    () => Array.from(new Set([...blocked, ...seen])).sort(),
    [blocked, seen]
  );

  const suspiciousIps = useMemo(() => {
    const types = new Set(['suspicious', 'ddos', 'rate_limit', 'login_failed']);
    const map = new Map<string, { count: number; lastMessage: string }>();
    for (const row of logs) {
      if (!types.has(row.type)) continue;
      const prev = map.get(row.ip);
      map.set(row.ip, {
        count: (prev?.count ?? 0) + 1,
        lastMessage: row.message || row.type,
      });
    }
    return Array.from(map.entries())
      .map(([ip, meta]) => ({ ip, ...meta }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const blockIp = async (ip: string, reason?: string) => {
    await fetch('/api/waf/block', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip,
        reason: reason ?? 'SuperAdmin blokladi',
        source: 'security-panel',
      }),
    });
    mutateWaf();
  };

  const unblockIp = async (ip: string) => {
    await fetch('/api/waf/unblock', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    mutateWaf();
  };

  const statCards = useMemo(
    () => [
      { label: 'Noto‘g‘ri login (24s)', value: stats?.loginFailed ?? 0 },
      { label: 'Rate limit', value: stats?.rateLimit ?? 0 },
      { label: 'Shubhali / bot', value: stats?.suspicious ?? 0 },
      { label: 'DDoS belgisi', value: stats?.ddos ?? 0 },
      { label: 'Tashriflar', value: stats?.visits ?? 0 },
    ],
    [stats]
  );

  const tabBtn = (id: 'events' | 'ips', label: string) =>
    cn(
      'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
      tab === id
        ? 'bg-violet-600 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    );

  return (
    <div className="space-y-6">
      <SaSectionShell
        title="Xavfsizlik monitoringi"
        description="Noto‘g‘ri kirishlar, botlar, DDoS va qaysi manzilga murojaat qilinganini kuzatish"
        icon={ShieldAlert}
        iconClassName="bg-red-500/10 text-red-600"
        actions={
          <div className="flex gap-2">
            <button type="button" className={tabBtn('events', 'Hodisalar')}>
              Hodisalar
            </button>
            <button type="button" className={tabBtn('ips', 'IP boshqaruvi')}>
              IP boshqaruvi
            </button>
          </div>
        }>
        {statsLoading ?
          <div className="flex h-24 items-center justify-center p-6">
            <Loader2 className="size-6 animate-spin text-violet-500" />
          </div>
        : <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 sm:grid-cols-5">
            {statCards.map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                  {c.label}
                </p>
              </div>
            ))}
          </div>
        }

        {tab === 'events' && (
          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Filtr:</span>
              {['', 'login_failed', 'rate_limit', 'suspicious', 'ddos', 'visit'].map(
                (t) => (
                  <button
                    key={t || 'all'}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
                      filterType === t
                        ? 'bg-violet-600 text-white ring-violet-600'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                    )}>
                    {t ? TYPE_LABELS[t] ?? t : 'Hammasi'}
                  </button>
                )
              )}
            </div>

            {suspiciousIps.length > 0 && (
              <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-orange-800">
                  Shubhali / bot / hujum IP lari
                </p>
                <div className="space-y-2">
                  {suspiciousIps.slice(0, 12).map(({ ip, count, lastMessage }) => {
                    const isBlocked = blocked.includes(ip);
                    return (
                      <div
                        key={ip}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-orange-100">
                        <div>
                          <span className="font-mono text-sm font-medium text-slate-800">
                            {ip}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            ({count} hodisa) — {lastMessage}
                          </span>
                        </div>
                        {isBlocked ?
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => unblockIp(ip)}>
                            <ShieldCheck className="size-3.5" />
                            Blokdan chiqarish
                          </Button>
                        : <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-red-200 text-red-700"
                            onClick={() =>
                              blockIp(ip, `Shubhali trafik: ${lastMessage}`)
                            }>
                            <Ban className="size-3.5" />
                            Bloklash
                          </Button>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats?.topPaths?.length > 0 && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <Globe className="size-3.5" />
                  Eng ko‘p tashrif buyurilgan manzillar (24s)
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.topPaths.slice(0, 10).map(
                    (row: { path: string; count: number }) => (
                      <span
                        key={row.path}
                        className="rounded-lg bg-white px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        {row.path}{' '}
                        <strong className="text-violet-600">({row.count})</strong>
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {logsLoading ?
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-violet-500" />
              </div>
            : logs.length === 0 ?
              <p className="py-16 text-center text-sm text-slate-500">
                {activeFilter
                  ? `«${TYPE_LABELS[activeFilter] ?? activeFilter}» bo‘yicha hodisa topilmadi (24 soat ichida boshqa turlar bo‘lishi mumkin).`
                  : 'Hodisalar hali yo‘q'}
              </p>
            : <div className="max-h-[calc(100vh-420px)] overflow-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Vaqt</TableHead>
                      <TableHead className="text-xs">Turi</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                      <TableHead className="text-xs">Manzil</TableHead>
                      <TableHead className="text-xs">Izoh</TableHead>
                      <TableHead className="text-center text-xs">Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((row: {
                      _id?: string;
                      createdAt: string;
                      type: string;
                      ip: string;
                      path: string;
                      message?: string;
                      loginHint?: string;
                    }) => {
                      const rowBlocked = blocked.includes(row.ip);
                      const canBlock = ['suspicious', 'ddos', 'rate_limit', 'login_failed'].includes(
                        row.type
                      );
                      return (
                      <TableRow key={`${row.createdAt}-${row.ip}-${row.path}`}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                          {formatTime(row.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                              TYPE_CLASS[row.type] ??
                                'bg-slate-100 text-slate-700 ring-slate-200'
                            )}>
                            {TYPE_LABELS[row.type] ?? row.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-mono text-xs">
                          {row.path}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-slate-600">
                          {row.message || row.loginHint || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {rowBlocked ?
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 border-emerald-200 px-2 text-[10px] text-emerald-700"
                              onClick={() => unblockIp(row.ip)}>
                              <ShieldCheck className="size-3" />
                              Ochish
                            </Button>
                          : canBlock ?
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-600 hover:bg-red-50"
                              onClick={() =>
                                blockIp(row.ip, row.message || row.type)
                              }>
                              <Ban className="size-3.5" />
                            </Button>
                          : '—'}
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>
            }
          </div>
        )}

        {tab === 'ips' && (
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <span className="rounded-lg bg-slate-100 px-3 py-1.5">
                Ko‘rilgan IP: <strong>{seen.length}</strong>
              </span>
              <span className="rounded-lg bg-red-50 px-3 py-1.5 text-red-700 ring-1 ring-red-100">
                Bloklangan: <strong>{blocked.length}</strong>
              </span>
            </div>

            {wafLoading ?
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-violet-500" />
              </div>
            : allManagedIps.length === 0 ?
              <div className="flex flex-col items-center gap-2 py-16 text-slate-500">
                <ShieldCheck className="size-10 text-slate-300" />
                <p className="text-sm">Hozircha IP manzillar yo‘q</p>
              </div>
            : <div className="max-h-[calc(100vh-380px)] overflow-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-12 text-center text-xs">№</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                      <TableHead className="text-center text-xs">Holat</TableHead>
                      <TableHead className="text-center text-xs">Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allManagedIps.map((ip: string, index: number) => {
                      const isBlocked = blocked.includes(ip);
                      return (
                        <TableRow key={ip}>
                          <TableCell className="text-center text-sm">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{ip}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                isBlocked
                                  ? 'bg-red-100 text-red-700 ring-red-200'
                                  : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                              )}>
                              {isBlocked ? 'Bloklangan' : 'Faol'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isBlocked ?
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1"
                                onClick={() => unblockIp(ip)}>
                              <ShieldCheck className="size-3.5" />
                              Blokdan chiqarish
                            </Button>
                            : <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 border-red-200 text-red-700"
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
            }

            <p className="mt-4 flex items-start gap-2 text-xs text-slate-600">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              Bloklangan IP lar MongoDB da saqlanadi. Blokdan chiqarish — «Ochish» /
              «Blokdan chiqarish» tugmasi; middleware ~4 soniyada yangilanadi.
            </p>
          </div>
        )}
      </SaSectionShell>
    </div>
  );
}
