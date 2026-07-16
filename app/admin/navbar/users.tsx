'use client';

import useGrantUser from '@/hooks/useGrantUserHook';
import useRevokeUser from '@/hooks/useRevokUserHook';
import { useSessionsUsers } from '@/hooks/useSessionsUsers';
import { cn } from '@/lib/utils';
import {
  CircleUserRound,
  Loader2,
  Search,
  UserRoundCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { SectionShell } from './shared';

const UsersPage = () => {
  const { users, loading, refetch } = useSessionsUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const { revokeUser, loadingIds } = useRevokeUser(refetch);
  const { grantUser, loadingIds: grantLoadingIds } = useGrantUser(refetch);

  const filteredUsers = users?.filter((user) => {
    const fullName =
      `${user.personal?.name || ''} ${user.personal?.fName || ''}`.toLowerCase();
    const organ = user.job?.organ?.toLowerCase() || '';
    const department = user.job?.department?.toLowerCase() || '';
    const position = user.job?.position?.toLowerCase() || '';
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      organ.includes(searchTerm.toLowerCase()) ||
      department.includes(searchTerm.toLowerCase()) ||
      position.includes(searchTerm.toLowerCase())
    );
  });

  const pendingCount =
    filteredUsers?.filter((u) => !u.job?.isUserTrue).length ?? 0;

  return (
    <SectionShell
      title="Foydalanuvchilar"
      description="Ro‘yxatdan o‘tganlar — ruxsat berilguncha tizimga kira olmaydi"
      icon={Users}
      iconClassName="bg-violet-500/10 text-violet-600">
      <div className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Foydalanuvchini qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <p className="text-sm text-slate-500">
            Jami:{' '}
            <span className="font-semibold text-slate-800">
              {filteredUsers?.length || 0}
            </span>
            {pendingCount > 0 && (
              <>
                {' '}
                · Kutilmoqda:{' '}
                <span className="font-semibold text-amber-600">
                  {pendingCount}
                </span>
              </>
            )}
          </p>
        </div>

        {loading ?
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-sky-500" />
          </div>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-300px)] overflow-auto">
              <div className="grid grid-cols-10 gap-0 border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className="px-3 py-3">№</div>
                <div className="px-3 py-3" />
                <div className="px-3 py-3">Bo‘lim</div>
                <div className="px-3 py-3">Unvon</div>
                <div className="px-3 py-3">F.I.Sh</div>
                <div className="px-3 py-3">Bo‘linma</div>
                <div className="px-3 py-3">Lavozim</div>
                <div className="px-3 py-3">Holat</div>
                <div className="px-3 py-3">Chiqarish</div>
                <div className="px-3 py-3">Ruxsat</div>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredUsers?.length === 0 ?
                  <div className="px-6 py-12 text-center text-sm text-slate-500">
                    Foydalanuvchi topilmadi
                  </div>
                : filteredUsers?.map((user, index) => {
                    const approved = Boolean(user.job?.isUserTrue);
                    return (
                      <div
                        key={user.userId}
                        className="grid grid-cols-10 items-center transition-colors hover:bg-sky-50/40">
                        <div className="px-3 py-3 text-sm text-slate-500">
                          {index + 1}
                        </div>
                        <div className="px-3 py-3">
                          <CircleUserRound className="size-5 text-slate-400" />
                        </div>
                        <div className="px-3 py-3 text-sm">
                          {user.job?.organ}
                        </div>
                        <div className="px-3 py-3 text-sm">
                          {user.job?.militaryRank}
                        </div>
                        <div className="px-3 py-3 text-sm font-medium text-slate-800">
                          {user.personal?.name} {user.personal?.fName}
                        </div>
                        <div className="px-3 py-3 text-sm">
                          {user.job?.department}
                        </div>
                        <div className="px-3 py-3 text-sm">
                          {user.job?.position}
                        </div>
                        <div className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                              approved ?
                                'bg-emerald-100 text-emerald-700 ring-emerald-200'
                              : 'bg-amber-100 text-amber-700 ring-amber-200'
                            )}>
                            {approved ? 'Ruxsat bor' : 'Kutilmoqda'}
                          </span>
                        </div>
                        <div className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => revokeUser(user.userId)}
                            disabled={loadingIds.has(user.userId) || !approved}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40">
                            <UserRoundX className="size-3.5" />
                            Chiqarish
                          </button>
                        </div>
                        <div className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => grantUser(user.userId)}
                            disabled={
                              grantLoadingIds.has(user.userId) || approved
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
                            <UserRoundCheck className="size-3.5" />
                            Ruxsat
                          </button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        }
      </div>
    </SectionShell>
  );
};

export default UsersPage;
