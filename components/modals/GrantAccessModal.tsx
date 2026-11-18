'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ASSIGNABLE_ROLES,
  isAssignableRole,
  PERMISSIONS,
  ROLE_AVAILABLE_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  type AssignableRole,
  type Permission,
} from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { GrantPayload } from '@/hooks/useGrantUserHook';
import type { IUserPopulated } from '@/types/user';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  user: IUserPopulated | null;
  onClose: () => void;
  onSubmit: (userId: string, payload: GrantPayload) => Promise<unknown>;
  busy: boolean;
}

function initialState(user: IUserPopulated | null) {
  const role: AssignableRole = isAssignableRole(user?.job?.roleName) ? user.job.roleName : 'user';
  const available = new Set<string>(ROLE_AVAILABLE_PERMISSIONS[role]);
  const current = (user?.job?.permissions ?? []).filter((p) => available.has(p)) as Permission[];
  return { role, permissions: current.length > 0 ? current : [...ROLE_DEFAULT_PERMISSIONS[role]] };
}

export default function GrantAccessModal(props: Props) {
  // Har bir user uchun forma holati yangidan boshlanadi
  return <GrantAccessDialog key={props.user?.userId ?? 'none'} {...props} />;
}

function GrantAccessDialog({ user, onClose, onSubmit, busy }: Props) {
  const [role, setRole] = useState<AssignableRole>(() => initialState(user).role);
  const [selected, setSelected] = useState<Set<Permission>>(
    () => new Set(initialState(user).permissions)
  );

  const available = ROLE_AVAILABLE_PERMISSIONS[role];
  const approved = Boolean(user?.job?.isUserTrue);

  const changeRole = (next: AssignableRole) => {
    setRole(next);
    // Yangi rolga mos bo'lmagan huquqlar olib tashlanadi; bo'sh qolsa — standart huquqlar
    const allowed = new Set<string>(ROLE_AVAILABLE_PERMISSIONS[next]);
    const kept = [...selected].filter((p) => allowed.has(p));
    setSelected(new Set(kept.length > 0 ? kept : ROLE_DEFAULT_PERMISSIONS[next]));
  };

  const toggle = (p: Permission, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });

  const allOn = available.every((p) => selected.has(p));

  const submit = async () => {
    if (!user) return;
    const res = await onSubmit(user.userId, {
      role,
      permissions: available.filter((p) => selected.has(p)),
    });
    if (res) onClose();
  };

  const fullName = [user?.personal?.fName, user?.personal?.name, user?.personal?.sName]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{approved ? 'Huquqlarni o‘zgartirish' : 'Tizimga kirishga ruxsat berish'}</DialogTitle>
          <DialogDescription>
            {fullName}
            {user?.job?.position ? ` · ${user.job.position}` : ''}
            {user?.job?.department ? ` · ${user.job.department}` : ''}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Rol</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ASSIGNABLE_ROLES.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  role === r ? 'border-gold bg-gold-soft text-primary' : 'border-slate-200 hover:bg-slate-50'
                )}>
                <input
                  type="radio"
                  name="grant-role"
                  value={r}
                  checked={role === r}
                  onChange={() => changeRole(r)}
                  className="accent-primary"
                />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-sm font-semibold text-slate-800">Huquqlar</legend>
            <button
              type="button"
              onClick={() => setSelected(new Set(allOn ? [] : available))}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline">
              {allOn ? 'Hammasini olib tashlash' : 'Hammasini belgilash'}
            </button>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {available.map((p) => (
              <label
                key={p}
                htmlFor={`perm-${p}`}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <Checkbox
                  id={`perm-${p}`}
                  checked={selected.has(p)}
                  onCheckedChange={(v) => toggle(p, v === true)}
                />
                {PERMISSIONS[p]}
              </label>
            ))}
          </div>
          {selected.size === 0 && (
            <p className="text-xs text-amber-700">Kamida bitta huquqni belgilang.</p>
          )}
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="button" onClick={submit} disabled={busy || selected.size === 0} className="gap-2">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {approved ? 'Saqlash' : 'Ruxsat berish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
