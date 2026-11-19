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
import { AlertTriangle, FileKey2, Loader2, ShieldCheck, ShieldX, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { SaSectionShell } from './shared';

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
  const rows = data?.certificates ?? [];

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

        <form onSubmit={upload} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
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

        {isLoading ?
          <LoadingState message="Sertifikatlar yuklanmoqda..." />
        : isError ?
          <ErrorState onRetry={() => void refetch()} />
        : rows.length === 0 ?
          <EmptyState
            title="Hali sertifikat biriktirilmagan"
            description="Biriktirilgan userlar tizimga parol va E-IMZO kaliti bilan kiradi."
          />
        : <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Sertifikat egasi</th>
                  <th className="px-3 py-3">Amal qilish</th>
                  <th className="px-3 py-3">Holat</th>
                  <th className="px-3 py-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const expired = new Date(r.notAfter) < new Date();
                  return (
                    <tr key={r.id} className="align-top hover:bg-primary-soft/60">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{r.fullName || '—'}</div>
                        <div className="text-xs text-slate-500">{r.login}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <div>{r.subject}</div>
                        <div className="mt-1 font-mono text-[11px] text-slate-400" title={r.fingerprint256}>
                          SHA-256 {r.fingerprint256.slice(0, 23)}…
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                        {fmt(r.notBefore)} — {fmt(r.notAfter)}
                      </td>
                      <td className="px-3 py-3">
                        {r.status === 'revoked' ?
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200" title={r.revokedReason ?? ''}>
                            Bekor qilingan
                          </span>
                        : expired ?
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                            Muddati tugagan
                          </span>
                        : <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            Faol
                          </span>}
                        {r.revokedReason && <p className="mt-1 max-w-[200px] text-xs text-slate-500">{r.revokedReason}</p>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setRevokeTarget(r)}
                            aria-label={`${r.login} sertifikatini bekor qilish`}
                            className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-red-50 px-2.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
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
        }
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
