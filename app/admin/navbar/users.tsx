'use client';

import GrantAccessModal from '@/components/modals/GrantAccessModal';
import EditUserModal from '@/components/modals/EditUserModal';
import useGrantUser from '@/hooks/useGrantUserHook';
import { isAssignableRole, ROLE_LABELS } from '@/lib/roles';
import type { IUserPopulated } from '@/types/user';
import LoadingState from '@/components/LoadingState';
import useRevokeUser from '@/hooks/useRevokUserHook';
import { useSessionsUsers } from '@/hooks/useSessionsUsers';
import { cn } from '@/lib/utils';
import {
  CircleUserRound,
  ShieldCheck,
  Pencil,
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
  const [grantTarget, setGrantTarget] = useState<IUserPopulated | null>(null);
  const [editTarget, setEditTarget] = useState<IUserPopulated | null>(null);

  const filteredUsers = users?.filter((user) => {
    const fullName =
      `${user.personal?.name || ''} ${user.personal?.fName || ''}`.toLowerCase();
    const organ = user.job?.organ?.toLowerCase() || '';
    const department = user.job?.department?.toLowerCase() || '';
    const position = user.job?.position?.toLowerCase() || '';
    const login = user.login?.toLowerCase() || '';
    return (
      login.includes(searchTerm.toLowerCase()) ||
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/30"
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
          <LoadingState fullScreen message="Foydalanuvchilar yuklanmoqda..." />
        : <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[calc(100vh-300px)] overflow-auto">
              <div className="grid grid-cols-10 gap-0 border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className="px-3 py-3">№</div>
                <div className="px-3 py-3" />
                <div className="px-3 py-3">Shahobcha</div>
                <div className="px-3 py-3">Unvon</div>
                <div className="px-3 py-3">F.I.Sh / login</div>
                <div className="px-3 py-3">Bo‘lim</div>
                <div className="px-3 py-3">Lavozim</div>
                <div className="px-3 py-3">Holat</div>
                <div className="px-3 py-3">Chiqarish</div>
                <div className="px-3 py-3">Ruxsat / huquq</div>
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
                        className="grid grid-cols-10 items-center transition-colors hover:bg-primary-soft/60">
                        <div className="px-3 py-3 text-sm text-slate-500">
                          {index + 1}
                        </div>
                        <div className="px-3 py-3">
                          <CircleUserRound className="size-5 text-slate-400" />
                        </div>
                        <div className="px-3 py-3 text-sm">
                          {user.job?.shahobcha || user.job?.organ}
                        </div>
                        <div className="px-3 py-3 text-sm">
                          {user.job?.militaryRank}
                        </div>
                        <div className="px-3 py-3 text-sm">
                          <div className="flex items-start gap-1.5">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800">
                                {user.personal?.fName} {user.personal?.name} {user.personal?.sName}
                              </p>
                              {user.login ?
                                <p className="truncate font-mono text-xs text-slate-500" title="Login">
                                  {user.login}
                                </p>
                              : null}
                            </div>
                            {user.job?.roleName !== 'admin' && user.job?.roleName !== 'superAdmin' ?
                              <button
                                type="button"
                                onClick={() => setEditTarget(user)}
                                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                                aria-label="Ma’lumotlarni tahrirlash"
                                title="Ma’lumotlarni tahrirlash">
                                <Pencil className="size-3.5" />
                              </button>
                            : null}
                          </div>
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
                          {user.job?.roleName && (
                            <p className="mt-1 text-xs text-slate-500">
                              {isAssignableRole(user.job.roleName) || user.job.roleName === 'admin' ?
                                ROLE_LABELS[user.job.roleName as keyof typeof ROLE_LABELS]
                              : user.job.roleName}
                              {approved && user.job.permissions ? ` · ${user.job.permissions.length} ta huquq` : ''}
                            </p>
                          )}
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
                          {user.job?.roleName === 'admin' || user.job?.roleName === 'superAdmin' ?
                            <span className="text-xs text-slate-400">SuperAdmin boshqaradi</span>
                          : approved ?
                            <button
                              type="button"
                              onClick={() => setGrantTarget(user)}
                              disabled={grantLoadingIds.has(user.userId)}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20 transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">
                              <ShieldCheck className="size-3.5" />
                              Huquqlar
                            </button>
                          : <button
                              type="button"
                              onClick={() => setGrantTarget(user)}
                              disabled={grantLoadingIds.has(user.userId)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
                              <UserRoundCheck className="size-3.5" />
                              Ruxsat
                            </button>
                          }
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
      <GrantAccessModal
        user={grantTarget}
        onClose={() => setGrantTarget(null)}
        onSubmit={grantUser}
        busy={!!grantTarget && grantLoadingIds.has(grantTarget.userId)}
      />
      <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={refetch} />
    </SectionShell>
  );
};

export default UsersPage;
