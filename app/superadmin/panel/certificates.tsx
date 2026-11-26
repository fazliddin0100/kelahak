'use client';

import EmptyState, { ErrorState } from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Cpu, FileKey2, KeyRound, ListChecks, Loader2, ShieldCheck, ShieldX, Upload } from 'lucide-react';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import EimzoDevicesCard from './eimzo-devices';
import KeyRequestCard from './key-request';
import { SaSectionShell } from './shared';
import { StatusPill, TablePager, TableSearch, useSearchPaging } from './table-tools';

type CertRow = {
  id: string;
  fingerprint256: string;
  serialNumber: string;
  subject: string;
  notBefore: string;
  notAfter: string;
  status: 'active' | 'revoked';
  revokedAt: string | null;
  revokedReason: string | null;
  login: string;
  fullName: string;
};

type CaInfo = { configured: boolean; subject?: string; validTo?: string; message?: string };

const fmt = (d: string) => new Date(d).toLocaleDateString('uz-UZ');

type CertState = 'active' | 'expired' | 'revoked';
const certState = (r: CertRow): CertState =>
  r.status === 'revoked' ? 'revoked'
  : new Date(r.notAfter) < new Date() ? 'expired'
  : 'active';

const STATE_FILTERS: { key: 'all' | CertState; label: string }[] = [
  { key: 'all', label: 'Hammasi' },
  { key: 'active', label: 'Faol' },
  { key: 'expired', label: 'Muddati tugagan' },
  { key: 'revoked', label: 'Bekor qilingan' },
];

const tabTrigger =
  'h-9 flex-none gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm';

export default function SuperAdminCertificates() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['superadmin-certificates'],
    queryFn: async (): Promise<{ ca: CaInfo; certificates: CertRow[] }> => {
      const res = await fetch('/api/superadmin/certificates', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('load failed');
      return res.json();
    },
  });

  const [login, setLogin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<CertRow | null>(null);
  const [reason, setReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  const upload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    if (!login.trim() || !file) {
      setFormError('Login va sertifikat faylini tanlang.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: login.trim(), certPem: await file.text() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(body.message || 'Biriktirib bo‘lmadi');
        return;
      }
      toast.success(body.message || 'Sertifikat biriktirildi');
      setLogin('');
      setFile(null);
      (e.target as HTMLFormElement).reset();
      void refetch();
    } catch {
      setFormError('Server bilan aloqa yo‘q.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/superadmin/certificates/${revokeTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message || 'Bekor qilib bo‘lmadi');
        return;
      }
      toast.success(body.message || 'Bekor qilindi');
      setRevokeTarget(null);
      setReason('');
      void refetch();
    } finally {
      setRevoking(false);
    }
  };

  const ca = data?.ca;
  const allRows = useMemo(() => data?.certificates ?? [], [data]);
  const [stateFilter, setStateFilter] = useState<'all' | CertState>('all');
  const counts = useMemo(() => {
    const c = { all: allRows.length, active: 0, expired: 0, revoked: 0 };
    for (const r of allRows) c[certState(r)]++;
    return c;
  }, [allRows]);
  const stateRows = useMemo(
    () => (stateFilter === 'all' ? allRows : allRows.filter((r) => certState(r) === stateFilter)),
    [allRows, stateFilter]
  );
  const haystack = useCallback(
    (r: CertRow) => [r.fullName, r.login, r.subject, r.serialNumber, r.fingerprint256].join(' '),
    []
  );
  const t = useSearchPaging(stateRows, haystack, 50);

  return (
    <SaSectionShell
      title="E-IMZO sertifikatlari"
      description="Userga ochiq sertifikat (.crt) biriktiriladi. Yopiq kalit serverga hech qachon yuklanmaydi."
      icon={FileKey2}>
      <div className="space-y-5 p-5">
        {ca && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl p-3 text-sm ring-1',
              ca.configured ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
            )}>
            {ca.configured ?
              <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
            <p>
              {ca.configured ?
                <>Ishonchli sertifikat markazi: <b>{ca.subject}</b> (amal qiladi: {ca.validTo})</>
              : <>{ca.message} <code className="font-mono">scripts/pki/README.md</code> ga qarang.</>}
            </p>
          </div>
        )}

        <Tabs defaultValue="create" className="gap-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
            <TabsTrigger value="create" className={tabTrigger}>
              <KeyRound className="size-4" />
              Kalit va sertifikat so‘rovi
            </TabsTrigger>
            <TabsTrigger value="devices" className={tabTrigger}>
              <Cpu className="size-4" />
              E-IMZO kompyuterlari
            </TabsTrigger>
            <TabsTrigger value="list" className={tabTrigger}>
              <ListChecks className="size-4" />
              Sertifikatlar ro‘yxati
              {counts.all > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 text-[11px] tabular-nums text-slate-600">{counts.all}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-5">
            <KeyRequestCard />
            <form onSubmit={upload} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
              <h3 className="text-sm font-semibold text-slate-800 sm:col-span-3">
                Tashqarida imzolangan sertifikatni (.crt) userga biriktirish
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="cert-login">User logini</Label>
                <Input id="cert-login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="masalan: aliyev_a" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cert-file">Sertifikat (.crt)</Label>
                <Input
                  id="cert-file"
                  type="file"
                  accept=".crt,.pem"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
              </div>
              <Button type="submit" disabled={saving || !ca?.configured} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Biriktirish
              </Button>
              {formError && (
                <p role="alert" className="text-sm text-red-700 sm:col-span-3">
                  {formError}
                </p>
              )}
            </form>
          </TabsContent>

          <TabsContent value="devices">
            <EimzoDevicesCard />
          </TabsContent>

          <TabsContent value="list" className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TableSearch
                value={t.query}
                onChange={t.setQuery}
                placeholder="F.I.Sh, login, seriya yoki SHA-256..."
                label="Sertifikatlarni qidirish"
              />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Holat bo‘yicha saralash">
                {STATE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setStateFilter(f.key);
                      t.setPage(0);
                    }}
                    aria-pressed={stateFilter === f.key}
                    className={cn(
                      'h-8 rounded-full px-3 text-xs font-medium ring-1 transition',
                      stateFilter === f.key ?
                        'bg-primary text-white ring-primary'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                    )}>
                    {f.label} <span className="tabular-nums opacity-75">{counts[f.key]}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ?
              <LoadingState message="Sertifikatlar yuklanmoqda..." />
            : isError ?
              <ErrorState onRetry={() => void refetch()} />
            : allRows.length === 0 ?
              <EmptyState
                title="Hali sertifikat biriktirilmagan"
                description="Biriktirilgan userlar tizimga parol va E-IMZO kaliti bilan kiradi."
              />
            : t.total === 0 ?
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Hech narsa topilmadi.</p>
            : <>
                <div className="max-h-[calc(100vh-360px)] min-h-[240px] overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
                      <tr>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Login</th>
                        <th className="px-3 py-2">Seriya / SHA-256</th>
                        <th className="px-3 py-2">Amal qilish</th>
                        <th className="px-3 py-2">Holat</th>
                        <th className="px-3 py-2 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {t.rows.map((r) => {
                        const st = certState(r);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className="max-w-[240px] truncate px-3 py-1.5 font-medium text-slate-800" title={r.subject}>
                              {r.fullName || '—'}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-[11px] text-slate-600">{r.login}</td>
                            <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500" title={`${r.serialNumber}  SHA-256 ${r.fingerprint256}`}>
                              {r.serialNumber.slice(0, 12)}… · {r.fingerprint256.slice(0, 11)}…
                            </td>
                            <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                              {fmt(r.notBefore)} — {fmt(r.notAfter)}
                            </td>
                            <td className="px-3 py-1.5">
                              {st === 'revoked' ?
                                <StatusPill tone="red" title={r.revokedReason ?? ''}>Bekor qilingan</StatusPill>
                              : st === 'expired' ?
                                <StatusPill tone="amber">Muddati tugagan</StatusPill>
                              : <StatusPill tone="green">Faol</StatusPill>}
                            </td>
                            <td className="px-3 py-1 text-right">
                              {r.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => setRevokeTarget(r)}
                                  aria-label={`${r.login} sertifikatini bekor qilish`}
                                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                                  <ShieldX className="size-3.5" />
                                  Bekor qilish
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <TablePager page={t.page} pageCount={t.pageCount} total={t.total} pageSize={t.pageSize} onPage={t.setPage} />
              </>
            }
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!revokeTarget} onOpenChange={(v) => !v && !revoking && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-600" />
              Sertifikatni bekor qilasizmi?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <b className="text-slate-800">{revokeTarget?.fullName || revokeTarget?.login}</b> ning sertifikati
                  bekor qilinadi va uning ochiq sessiyalari yopiladi. Bu amalni qaytarib bo‘lmaydi.
                </p>
                <p>U yana tizimga kirishi uchun yangi kalit va sertifikat berish kerak bo‘ladi.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="revoke-reason">Sabab</Label>
            <Input
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="masalan: fleshka yo‘qolgan"
              maxLength={300}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Orqaga</AlertDialogCancel>
            <Button variant="destructive" onClick={revoke} disabled={revoking || !reason.trim()} className="gap-2">
              {revoking && <Loader2 className="size-4 animate-spin" />}
              Ha, bekor qilish
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SaSectionShell>
  );
}
