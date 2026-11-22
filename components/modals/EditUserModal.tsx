'use client';

import { useState } from 'react';
import { Loader2, UserRoundPen } from 'lucide-react';
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
import { toast } from '@/components/ui/sonner';
import type { IUserPopulated } from '@/types/user';
import UserCredentialsSection from './UserCredentialsSection';

type Form = {
  fName: string;
  name: string;
  sName: string;
  militaryRank: string;
  position: string;
  department: string;
};

const FIELDS: { key: keyof Form; label: string; required?: boolean }[] = [
  { key: 'fName', label: 'Familiya', required: true },
  { key: 'name', label: 'Ism', required: true },
  { key: 'sName', label: 'Otasining ismi' },
  { key: 'militaryRank', label: 'Unvon' },
  { key: 'position', label: 'Lavozim' },
  { key: 'department', label: 'Bo‘lim' },
];

/** Admin: xodimning shaxsiy va ish ma'lumotlarini tahrirlash (login o'zgarmaydi) */
export default function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: (IUserPopulated & { login?: string }) | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  // Tahrir qilinayotgan qiymatlar shu user uchun saqlanadi; boshqa user ochilsa — boshlang'ich qiymatlar
  const [draft, setDraft] = useState<{ id: string; form: Form } | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = (u: IUserPopulated): Form => ({
    fName: u.personal?.fName ?? '',
    name: u.personal?.name ?? '',
    sName: u.personal?.sName ?? '',
    militaryRank: u.job?.militaryRank ?? '',
    position: u.job?.position ?? '',
    department: u.job?.department ?? '',
  });
  const form: Form | null = user ? (draft?.id === user.userId ? draft.form : initial(user)) : null;
  const setForm = (next: Form) => user && setDraft({ id: user.userId, form: next });

  const save = async () => {
    if (!user || !form) return;
    if (!form.fName.trim() || !form.name.trim()) return toast.error('Familiya va ism bo‘sh bo‘lmasin');
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.message || 'Saqlab bo‘lmadi');
      toast.success(data.message || 'Saqlandi');
      setDraft(null);
      onClose();
      await onSaved?.();
    } catch {
      toast.error('Server xatosi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!user}
      onOpenChange={(v) => {
        if (!v && !saving) {
          setDraft(null);
          onClose();
        }
      }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPen className="size-5 text-primary" />
            Foydalanuvchi ma’lumotlari
          </DialogTitle>
          <DialogDescription>
            Shaxsiy va ish ma’lumotlari, pastda — login va parol. Rol va huquqlar «Huquqlar» oynasida.
          </DialogDescription>
        </DialogHeader>
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block text-sm font-medium text-slate-700">
                {f.label}
                {f.required ? <span className="text-red-500"> *</span> : null}
                <Input
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  maxLength={f.key === 'position' || f.key === 'department' ? 150 : 80}
                  className="mt-1"
                />
              </label>
            ))}
          </div>
        )}
        {user && (
          <UserCredentialsSection
            key={user.userId}
            userId={user.userId}
            currentLogin={user.login ?? ''}
            onSaved={onSaved}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Yopish
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Ma’lumotlarni saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
