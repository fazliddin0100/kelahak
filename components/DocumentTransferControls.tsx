'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useDepartmentPeers } from '@/hooks/useDepartmentPeers';
import { useRoleHook } from '@/hooks/useRoleHook';
import { resolveIdReference } from '@/lib/resolveIdReference';
import type { DocumentType } from '@/types/document';

const TRANSFERABLE = ['imzolandi', 'registered', 'qabul_qilindi'];

const btn =
  'h-9 gap-2 rounded-md border-slate-200 bg-white text-slate-700 hover:border-gold hover:bg-slate-50 hover:text-primary';

/**
 * Hujjatni boshqa xodimga topshirish (egasi) va topshirilgan hujjatni qabul qilish (qabul qiluvchi).
 * Masalan: ta'til bildirgisi kadrlar bo'limiga o'tadi va o'sha yerda saqlanadi.
 */
export default function DocumentTransferControls({
  document,
  onRefresh,
}: {
  document: DocumentType & { pendingTransferToId?: string | null; nomenclatureId?: unknown };
  onRefresh?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { userId } = useRoleHook();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const { users, loading } = useDepartmentPeers();

  const ownerId = resolveIdReference(document.owner);
  const pendingTo = document.pendingTransferToId ?? null;
  const isOwner = !!userId && ownerId === userId;
  const isRecipient = !!userId && pendingTo === userId;
  const canTransfer =
    isOwner && !pendingTo && TRANSFERABLE.includes(document.status ?? '') && !document.nomenclatureId;

  const call = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || 'Xatolik!');
        return false;
      }
      toast.success(data.message || 'Bajarildi');
      return true;
    } catch {
      toast.error('Server xatosi!');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (isRecipient) {
    return (
      <Button
        onClick={async () => {
          if (await call(`/api/documents/${document._id}/transfer/accept`, 'POST')) {
            await onRefresh?.();
            router.refresh();
          }
        }}
        disabled={busy}
        className="h-9 gap-2 rounded-md">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Qabul qilish
      </Button>
    );
  }

  if (isOwner && pendingTo) {
    const name = users.find((u) => u.userId === pendingTo)?.fullName ?? 'xodim';
    return (
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (await call(`/api/documents/${document._id}/transfer`, 'DELETE')) await onRefresh?.();
        }}
        className={btn}
        title="Topshirishni bekor qilish">
        <ArrowRightLeft className="size-4 text-amber-600" />
        <span className="hidden sm:inline">Qabul kutilmoqda: {name}</span>
        <X className="size-4" />
      </Button>
    );
  }

  if (!canTransfer) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className={btn}>
        <ArrowRightLeft className="size-4" />
        <span>Topshirish</span>
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" />
              Hujjatni topshirish
            </DialogTitle>
            <DialogDescription>
              Xodim «Qabul qilish» ni bosgandan keyin hujjat unga o‘tadi va sizning ro‘yxatingizdan chiqadi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Kimga
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={loading}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <option value="">{loading ? 'Yuklanmoqda...' : 'Xodimni tanlang'}</option>
                {users
                  .filter((u) => u.userId !== userId)
                  .map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.fullName}
                      {u.job?.position ? ` — ${u.job.position}` : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Izoh (ixtiyoriy)
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1"
                placeholder="Masalan: rasmiylashtirish uchun"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Bekor qilish
            </Button>
            <Button
              disabled={busy || !target}
              className="gap-2"
              onClick={async () => {
                if (await call(`/api/documents/${document._id}/transfer`, 'POST', { userId: target, note: note.trim() })) {
                  setOpen(false);
                  setTarget('');
                  setNote('');
                  await onRefresh?.();
                }
              }}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Topshirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
