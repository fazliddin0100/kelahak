'use client';

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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export interface ShahobchaTarget {
  id: string;
  name: string;
  province: string;
  staffCount: number;
  admins: { userId: string; login: string; fullName: string }[];
}

async function send(url: string, method: 'PATCH' | 'DELETE', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Amalni bajarib bo‘lmadi');
  return data as { message?: string };
}

// ─── O'zgartirish ───────────────────────────────────────────────────────────

export function EditShahobchaDialog({
  target,
  onClose,
  onDone,
}: {
  target: ShahobchaTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  // Har bir shahobcha uchun forma yangidan boshlanadi
  return <EditForm key={target?.id ?? 'none'} target={target} onClose={onClose} onDone={onDone} />;
}

function EditForm({
  target,
  onClose,
  onDone,
}: {
  target: ShahobchaTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(target?.name ?? '');
  const [province, setProvince] = useState(target?.province ?? '');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const provinceLocked = (target?.staffCount ?? 0) > 0;
  const nameChanged = name.trim() !== target?.name;
  const provinceChanged = province !== target?.province;
  const changed = nameChanged || provinceChanged;

  const askConfirm = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Shahobcha nomini kiriting');
      return;
    }
    setConfirming(true);
  };

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const data = await send(`/api/superadmin/shahobcha/${target.id}`, 'PATCH', {
        name: name.trim(),
        province,
      });
      toast.success(data.message || 'Shahobcha o‘zgartirildi');
      setConfirming(false);
      onClose();
      onDone();
    } catch (e) {
      setConfirming(false);
      setError(e instanceof Error ? e.message : 'Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={!!target && !confirming} onOpenChange={(v) => !v && !saving && onClose()}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={askConfirm} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Shahobchani o‘zgartirish</DialogTitle>
              <DialogDescription>
                Nom o‘zgarsa, shahobchadagi barcha xodimlar ma’lumotida ham yangilanadi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sh-name">Nomi</Label>
              <Input id="edit-sh-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sh-province">Viloyat</Label>
              <select
                id="edit-sh-province"
                value={province}
                disabled={provinceLocked}
                onChange={(e) => setProvince(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60">
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {provinceLocked && (
                <p className="text-xs text-slate-500">
                  Shahobchada {target?.staffCount} ta xodim bor, shuning uchun viloyatni o‘zgartirib bo‘lmaydi.
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={!changed}>
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={(v) => !v && !saving && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              O‘zgartirishni tasdiqlaysizmi?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                {nameChanged && (
                  <p>
                    Nom: <b className="text-slate-800">{target?.name}</b> →{' '}
                    <b className="text-slate-800">{name.trim()}</b>
                  </p>
                )}
                {provinceChanged && (
                  <p>
                    Viloyat: <b className="text-slate-800">{target?.province}</b> →{' '}
                    <b className="text-slate-800">{province}</b>. Shahobcha adminining viloyati ham o‘zgaradi.
                  </p>
                )}
                {nameChanged && (target?.staffCount ?? 0) + (target?.admins.length ?? 0) > 0 && (
                  <p>
                    Yangi nom {(target?.staffCount ?? 0) + (target?.admins.length ?? 0)} ta foydalanuvchi ma’lumotiga
                    yoziladi.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Orqaga</AlertDialogCancel>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Ha, o‘zgartirish
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── O'chirish ──────────────────────────────────────────────────────────────

export function DeleteShahobchaDialog({
  target,
  onClose,
  onDone,
}: {
  target: ShahobchaTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const people = (target?.staffCount ?? 0) + (target?.admins.length ?? 0);

  const remove = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      const data = await send(`/api/superadmin/shahobcha/${target.id}`, 'DELETE');
      toast.success(data.message || 'Shahobcha o‘chirildi');
      onClose();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'O‘chirib bo‘lmadi');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(v) => !v && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            «{target?.name}» shahobchasini o‘chirasizmi?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Bu amalni qaytarib bo‘lmaydi.</p>
              {people > 0 ?
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Shahobchadagi <b className="text-slate-800">{people} ta foydalanuvchi</b> (admin va xodimlar)
                    tizimga kira olmay qoladi, ularning ochiq sessiyalari yopiladi.
                  </li>
                  <li>Foydalanuvchilar va ularning hujjatlari o‘chirilmaydi.</li>
                  <li>Ularni qayta ishlatish uchun boshqa shahobchaga biriktirish kerak bo‘ladi.</li>
                </ul>
              : <p>Shahobchada foydalanuvchi yo‘q.</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Bekor qilish</AlertDialogCancel>
          <Button variant="destructive" onClick={remove} disabled={deleting} className="gap-2">
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Ha, o‘chirish
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
