'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useDepartmentPeers } from '@/hooks/useDepartmentPeers';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';

interface ShareUserModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onShared?: () => void | Promise<void>;
}

export default function ShareUserModal({
  open,
  onClose,
  documentId,
  onShared,
}: ShareUserModalProps) {
  const { users, loading, province, organ } = useDepartmentPeers();
  const [selectedUser, setSelectedUser] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleShare = async () => {
    if (!selectedUser) {
      toast.error('Foydalanuvchini tanlang');
      return;
    }
    setSubmitting(true);
    try {
      const token =
        localStorage.getItem('ref_token') || localStorage.getItem('token');

      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: selectedUser }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Yuborishda xatolik');
        return;
      }
      toast.success(data.message || 'Hujjat yuborildi!');
      setSelectedUser('');
      await onShared?.();
      onClose();
    } catch {
      toast.error('Server xatosi');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Ko‘rish uchun yuborish
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tanlangan foydalanuvchi hujjatni ochib ko‘ra oladi (jumladan
              ro‘yxatga olingan hujjatlar).
            </p>
            {(province || organ) && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {province}
                {organ ? ` · ${organ}` : ''}
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </Button>
        </div>

        <label
          htmlFor="share-user-select"
          className="mb-1.5 block text-sm font-medium text-slate-700">
          Foydalanuvchi
        </label>
        {loading ?
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-sky-500" />
          </div>
        : <select
            id="share-user-select"
            className="w-full rounded-lg border border-slate-200 p-2.5 text-sm"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">Tanlang...</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.fullName}
                {u.job?.position ? ` — ${u.job.position}` : ''}
              </option>
            ))}
          </select>
        }

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Bekor qilish
          </Button>
          <Button onClick={handleShare} disabled={loading || submitting}>
            {submitting ?
              <Loader2 className="size-4 animate-spin" />
            : 'Yuborish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
