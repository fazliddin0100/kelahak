'use client';

import { Button } from '@/components/ui/button';
import LoadingState from '@/components/LoadingState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type KotibiyatUser = {
  userId: string;
  personal?: { fName?: string; name?: string; sName?: string };
  job?: { position?: string; militaryRank?: string };
};

function fullName(u: KotibiyatUser) {
  const p = u.personal;
  if (!p) return '—';
  return `${p.fName ?? ''} ${p.name ?? ''} ${p.sName ?? ''}`.trim() || '—';
}

type Props = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSent?: () => void | Promise<void>;
};

export default function KotibiyatSendModal({
  open,
  onClose,
  documentId,
  onSent,
}: Props) {
  const [users, setUsers] = useState<KotibiyatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/kotibiyat', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      setUsers(data.users ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Kotibiyat xodimlari yuklanmadi'
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      loadUsers();
    }
  }, [open, loadUsers]);

  const handleSend = async () => {
    if (!selectedId) {
      toast.error('Kotibiyat xodimini tanlang');
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/documents/${documentId}/submit-kotibiyat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kotibiyatUserId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Yuborishda xatolik');
      toast.success('Hujjat kotibiyatga yuborildi');
      onClose();
      await onSent?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kotibiyatga yuborish</DialogTitle>
          <DialogDescription>
            Ro‘yxatga olish uchun kotibiyat xodimini tanlang
          </DialogDescription>
        </DialogHeader>

        {loading ?
          <LoadingState message="Foydalanuvchilar yuklanmoqda..." className="py-4" />
        : users.length === 0 ?
          <p className="py-4 text-sm text-slate-500">
            Shu viloyatda kotibiyat xodimi topilmadi
          </p>
        : <ul className="max-h-64 space-y-2 overflow-y-auto">
            {users.map((u) => (
              <li key={u.userId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(u.userId)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === u.userId ?
                      'border-sky-500 bg-sky-50'
                    : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <span className="font-medium text-slate-800">
                    {fullName(u)}
                  </span>
                  {u.job?.position && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {u.job.position}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        }

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Bekor
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !selectedId || loading}>
            {sending ?
              <Loader2 className="size-4 animate-spin" />
            : 'Yuborish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
