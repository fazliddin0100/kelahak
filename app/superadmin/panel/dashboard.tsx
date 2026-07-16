'use client';

import { useSuperAdminStats } from '@/hooks/useSuperAdminStats';
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';
import { SaSectionShell } from './shared';

export default function SuperAdminDashboard() {
  const { stats, loading, error, refetch } = useSuperAdminStats();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-slate-600">
          {error || 'Statistika yuklanmadi'}
        </p>
        <p className="max-w-md text-xs text-slate-500">
          SuperAdmin sifatida{' '}
          <a href="/superadmin/login" className="text-violet-600 underline">
            /superadmin/login
          </a>{' '}
          orqali kiring. MongoDB (MONGOURL) ishlayotganini tekshiring.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500">
          Qayta yuklash
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: 'Jami foydalanuvchilar',
      value: stats.totalUsers,
      icon: Users,
      className: 'from-sky-500/10 to-sky-50 border-sky-200 text-sky-700',
    },
    {
      label: 'Tasdiqlanmagan',
      value: stats.pendingApproval,
      icon: Clock,
      className: 'from-amber-500/10 to-amber-50 border-amber-200 text-amber-700',
    },
    {
      label: 'Tasdiqlangan',
      value: stats.approvedUsers,
      icon: CheckCircle2,
      className:
        'from-emerald-500/10 to-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      label: 'SuperAdmin',
      value: stats.superAdminCount,
      icon: Shield,
      className:
        'from-violet-500/10 to-violet-50 border-violet-200 text-violet-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 px-4 pt-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {cards.map(({ label, value, icon: Icon, className }) => (
          <div
            key={label}
            className={`rounded-2xl border bg-gradient-to-br p-5 ${className}`}>
            <Icon className="mb-3 size-8 opacity-80" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{label}</p>
          </div>
        ))}
      </div>

      <SaSectionShell
        title="Viloyatlar bo‘yicha"
        description="Ro‘yxatdan o‘tgan foydalanuvchilar"
        icon={MapPin}
        iconClassName="bg-sky-500/10 text-sky-600">
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(stats.byProvince).map(([prov, count]) => (
            <div
              key={prov}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{prov}</span>
              <span className="text-sm font-bold text-violet-600">{count}</span>
            </div>
          ))}
        </div>
      </SaSectionShell>

      <SaSectionShell
        title="Rollar bo‘yicha"
        icon={Users}
        iconClassName="bg-violet-500/10 text-violet-600">
        <div className="flex flex-wrap gap-2 p-5">
          {Object.entries(stats.byRole).map(([role, count]) => (
            <span
              key={role}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
              {role}
              <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                {count}
              </span>
            </span>
          ))}
        </div>
      </SaSectionShell>
    </div>
  );
}
