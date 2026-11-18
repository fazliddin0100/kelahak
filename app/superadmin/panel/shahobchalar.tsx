'use client';

import EmptyState, { ErrorState } from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
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
import { provinces } from '@/lib/registrationConstants';
import { Building2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { DeleteShahobchaDialog, EditShahobchaDialog, type ShahobchaTarget } from './shahobcha-actions';
import { SaSectionShell } from './shared';

interface ShahobchaRow {
  id: string;
  name: string;
  province: string;
  admins: { userId: string; login: string; fullName: string }[];
  staffCount: number;
  pendingCount: number;
}

const EMPTY_FORM = {
  name: '',
  province: '',
  fName: '',
  adminName: '',
  sName: '',
  position: '',
  militaryRank: '',
  login: '',
  password: '',
};

export default function SuperAdminShahobchalar() {
  const {
    data: rows = [],
    isLoading: loading,
    isError: error,
    refetch,
  } = useQuery({
    queryKey: ['superadmin-shahobchalar'],
    queryFn: async (): Promise<ShahobchaRow[]> => {
      const res = await fetch('/api/superadmin/shahobcha', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      return data.shahobchalar ?? [];
    },
  });
  const load = () => void refetch();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [editTarget, setEditTarget] = useState<ShahobchaTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShahobchaTarget | null>(null);

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/shahobcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          province: form.province,
          admin: {
            fName: form.fName,
            name: form.adminName,
            sName: form.sName,
            position: form.position,
            militaryRank: form.militaryRank,
            login: form.login,
            password: form.password,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.message || 'Saqlab bo‘lmadi');
        return;
      }
      toast.success(data.message || 'Shahobcha yaratildi');
      setForm(EMPTY_FORM);
      setOpen(false);
      load();
    } catch {
      setFormError('Server bilan aloqa yo‘q. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaSectionShell
      title="Shahobchalar"
      description="Har bir shahobchaning admini shu shahobchaning kotibiyati hisoblanadi"
      icon={Building2}
      actions={
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Shahobcha qo‘shish
        </Button>
      }>
      <div className="p-5">
        {loading ?
          <LoadingState message="Shahobchalar yuklanmoqda..." />
        : error ?
          <ErrorState onRetry={load} />
        : rows.length === 0 ?
          <EmptyState
            title="Hali shahobcha yo‘q"
            description="“Shahobcha qo‘shish” tugmasi orqali birinchi shahobcha va uning adminini yarating."
          />
        : <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Shahobcha</th>
                  <th className="px-3 py-3">Viloyat</th>
                  <th className="px-3 py-3">Admin (kotibiyat)</th>
                  <th className="px-3 py-3">Xodimlar</th>
                  <th className="px-3 py-3">Ruxsat kutmoqda</th>
                  <th className="px-3 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-primary-soft/60">
                    <td className="px-3 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-3 py-3 text-slate-600">{r.province}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {r.admins.length === 0 ?
                        <span className="text-amber-700">Admin yo‘q</span>
                      : r.admins.map((a) => (
                          <div key={a.userId}>
                            {a.fullName} <span className="text-slate-400">· {a.login}</span>
                          </div>
                        ))
                      }
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.staffCount}</td>
                    <td className="px-3 py-3">
                      {r.pendingCount > 0 ?
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                          {r.pendingCount}
                        </span>
                      : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditTarget(r)}
                          aria-label={`${r.name} — o‘zgartirish`}
                          title="O‘zgartirish"
                          className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          aria-label={`${r.name} — o‘chirish`}
                          title="O‘chirish"
                          className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={submit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Yangi shahobcha</DialogTitle>
              <DialogDescription>
                Shahobcha bilan birga uning admini yaratiladi. Admin shu shahobchada ro‘yxatdan o‘tgan xodimlarga
                ruxsat va huquq beradi.
              </DialogDescription>
            </DialogHeader>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold text-slate-800">Shahobcha</legend>
              <Field id="sh-name" label="Nomi" value={form.name} onChange={set('name')} required />
              <div className="space-y-1.5">
                <Label htmlFor="sh-province">Viloyat</Label>
                <select
                  id="sh-province"
                  required
                  value={form.province}
                  onChange={(e) => set('province')(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <option value="">Viloyatni tanlang</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 text-sm font-semibold text-slate-800">Shahobcha admini</legend>
              <Field id="sh-fname" label="Familiya" value={form.fName} onChange={set('fName')} required />
              <Field id="sh-aname" label="Ism" value={form.adminName} onChange={set('adminName')} required />
              <Field id="sh-sname" label="Otasining ismi" value={form.sName} onChange={set('sName')} required />
              <Field id="sh-pos" label="Lavozim" value={form.position} onChange={set('position')} placeholder="Kotibiyat" />
              <Field id="sh-rank" label="Unvon" value={form.militaryRank} onChange={set('militaryRank')} />
              <div className="hidden sm:block" />
              <Field id="sh-login" label="Login" value={form.login} onChange={set('login')} required autoComplete="off" />
              <Field
                id="sh-pass"
                label="Parol"
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete="new-password"
                hint="Kamida bitta harf va raqam"
              />
            </fieldset>

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Shahobcha va adminni yaratish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <EditShahobchaDialog target={editTarget} onClose={() => setEditTarget(null)} onDone={load} />
      <DeleteShahobchaDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={load} />
    </SaSectionShell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'id'>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
