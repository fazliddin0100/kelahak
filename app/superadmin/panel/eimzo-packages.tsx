'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Download, Loader2, PackageCheck, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export type EimzoPackage = {
  id: string;
  userId: string;
  login: string;
  fullName: string;
  shahobcha: string;
  createdAt: string;
  notAfter: string | null;
  fingerprint256: string;
};
export type PackagesResponse = { autoIssue: boolean; packages: EimzoPackage[] };

function fmtDate(v: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('uz-UZ');
}

function fileNameFrom(res: Response, fallback: string) {
  const m = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
  return m?.[1] ?? fallback;
}

/**
 * Serverda tayyorlangan, yuklab olinishini kutayotgan E-IMZO paketlari.
 * Yuklab olish uchun superadmin o'z parolini qayta kiritadi; paket bir marta beriladi va o'chiriladi.
 */
export default function EimzoPackagesCard({ query }: { query: UseQueryResult<PackagesResponse> }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<EimzoPackage | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const packages = query.data?.packages ?? [];
  if (!query.data?.autoIssue && packages.length === 0) return null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['superadmin-eimzo-packages'] });
    void queryClient.invalidateQueries({ queryKey: ['superadmin-certificates'] });
  };

  const close = () => {
    setTarget(null);
    setPassword('');
    setError('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!password) return setError('Superadmin parolini kiriting.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/superadmin/certificates/packages/${encodeURIComponent(target.id)}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string };
        setError(d.message || 'Yuklab bo‘lmadi.');
        if (res.status === 404 || res.status === 410) refresh();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameFrom(res, `${target.login}-eimzo.zip`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`«${target.login}» paketi yuklab olindi va serverdan o‘chirildi`);
      close();
      refresh();
    } catch {
      setError('Server bilan aloqa uzildi.');
    } finally {
      setBusy(false);
      setPassword('');
    }
  };

  const cancel = async (p: EimzoPackage) => {
    if (!window.confirm(`«${p.login}» paketi bekor qilinsinmi? Uning sertifikati ham bekor qilinadi.`)) return;
    setCancelling(p.id);
    try {
      const res = await fetch(`/api/superadmin/certificates/packages/${encodeURIComponent(p.id)}/download`, {
        method: 'DELETE',
      });
      const d = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) toast.success(d.message || 'Bekor qilindi');
      else toast.error(d.message || 'Bekor qilib bo‘lmadi');
      refresh();
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <PackageCheck className="size-4 text-emerald-600" />
        Tayyor E-IMZO paketlari ({packages.length})
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Har bir paket (kalit .mzk, sertifikat .crt, CA zanjiri) faqat bir marta, superadmin paroli bilan yuklab
        olinadi va serverdan o‘chiriladi. Yuklab olinganda userning eski sertifikatlari bekor qilinadi.
      </p>

      {query.isLoading ?
        <p className="mt-3 text-sm text-slate-500">Yuklanmoqda...</p>
      : packages.length === 0 ?
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Kutilayotgan paket yo‘q.</p>
      : <ul className="mt-3 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {packages.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">
                  {p.fullName || p.login} <span className="font-mono text-xs text-slate-500">({p.login})</span>
                </p>
                <p className="text-xs text-slate-500">
                  {p.shahobcha || 'Shahobcha ko‘rsatilmagan'} · tayyorlangan: {fmtDate(p.createdAt)} · amal qiladi:{' '}
                  {fmtDate(p.notAfter)}
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setTarget(p)}>
                <Download className="size-4" />
                Yuklab olish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={cancelling === p.id}
                onClick={() => void cancel(p)}
                aria-label={`${p.login} paketini bekor qilish`}>
                {cancelling === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </li>
          ))}
        </ul>
      }

      <Dialog open={!!target} onOpenChange={(o) => !o && !busy && close()}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} autoComplete="off">
            <DialogHeader>
              <DialogTitle>Superadminligingizni tasdiqlang</DialogTitle>
              <DialogDescription>
                «{target?.login}» E-IMZO paketini yuklab olish uchun o‘z (superadmin) parolingizni kiriting. Paket
                bir marta beriladi va serverdan o‘chiriladi.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-1.5">
              <Label htmlFor="pkg-pass">Superadmin paroli</Label>
              <Input
                id="pkg-pass"
                type="password"
                value={password}
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Bekor
              </Button>
              <Button type="submit" disabled={busy} className="gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Tasdiqlash va yuklab olish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
