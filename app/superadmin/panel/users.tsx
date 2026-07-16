'use client';

import { Button } from '@/components/ui/button';
import { useSuperAdminUsers } from '@/hooks/useSuperAdminUsers';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  CircleUserRound,
  Loader2,
  Search,
  UserRoundCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { SaSectionShell } from './shared';

function saHeaders(): HeadersInit {
  const token =
    localStorage.getItem('sa_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function SuperAdminUsers() {
  const { users, loading, refetch } = useSuperAdminUsers();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const name = `${u.personal?.name} ${u.personal?.fName}`.toLowerCase();
    return (
      name.includes(q) ||
      (u.job?.department ?? '').toLowerCase().includes(q) ||
      (u.job?.roleName ?? '').toLowerCase().includes(q) ||
      (u.personal?.province ?? '').toLowerCase().includes(q)
    );
  });

  const grant = async (userId: string) => {
    setBusy(userId);
    try {
      const res = await fetch('/api/superadmin/users/grant', {
        method: 'POST',
        headers: saHeaders(),
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Ruxsat berildi');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (userId: string) => {
    setBusy(userId);
    try {
      const res = await fetch('/api/superadmin/users/revoke', {
        method: 'POST',
        headers: saHeaders(),
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Ruxsat bekor qilindi');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  const pending = filtered.filter((u) => !u.job?.isUserTrue).length;

  return (
    <SaSectionShell
      title="Barcha foydalanuvchilar"
      description="Barcha viloyatlar — ruxsat berish / bekor qilish (SuperAdmin)"
      icon={Users}
      iconClassName="bg-violet-500/10 text-violet-600">
      <div className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <p className="text-sm text-slate-500">
            Jami {filtered.length}
            {pending > 0 && (
              <>
                {' '}
                · <span className="font-semibold text-amber-600">{pending}</span>{' '}
                kutilmoqda
              </>
            )}
          </p>
        </div>

        {loading ?
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-violet-500" />
          </div>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-320px)] overflow-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">№</th>
                    <th className="px-3 py-3">F.I.Sh</th>
                    <th className="px-3 py-3">Viloyat</th>
                    <th className="px-3 py-3">Bo‘lim</th>
                    <th className="px-3 py-3">Rol</th>
                    <th className="px-3 py-3">Holat</th>
                    <th className="px-3 py-3 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u, i) => {
                    const ok = Boolean(u.job?.isUserTrue);
                    const isBusy = busy === u.userId;
                    return (
                      <tr key={u.userId} className="hover:bg-violet-50/30">
                        <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-3 font-medium">
                          <span className="flex items-center gap-2">
                            <CircleUserRound className="size-4 text-slate-400" />
                            {u.personal?.fName} {u.personal?.name}
                          </span>
                        </td>
                        <td className="px-3 py-3">{u.personal?.province}</td>
                        <td className="px-3 py-3">{u.job?.department}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                            {u.job?.roleName ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                              ok
                                ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                                : 'bg-amber-100 text-amber-700 ring-amber-200'
                            )}>
                            {ok ? 'Ruxsat bor' : 'Kutilmoqda'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center gap-1">
                            {!ok ?
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                className="h-8 border-emerald-200 text-emerald-700"
                                onClick={() => grant(u.userId)}>
                                {isBusy ?
                                  <Loader2 className="size-3.5 animate-spin" />
                                : <UserRoundCheck className="size-3.5" />}
                                Ruxsat
                              </Button>
                            : <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  isBusy || u.job?.roleName === 'superAdmin'
                                }
                                className="h-8 border-red-200 text-red-600"
                                onClick={() => revoke(u.userId)}>
                                {isBusy ?
                                  <Loader2 className="size-3.5 animate-spin" />
                                : <UserRoundX className="size-3.5" />}
                                Bekor
                              </Button>
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </SaSectionShell>
  );
}
