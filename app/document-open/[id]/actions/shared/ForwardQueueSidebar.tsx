'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useDepartmentPeers } from '@/hooks/useDepartmentPeers';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/document';
import {
  ChevronDown,
  ChevronUp,
  ListOrdered,
  Loader2,
  MessageSquarePlus,
  Send,
  Users,
} from 'lucide-react';
import { useState } from 'react';

type Props = {
  document: DocumentType;
  onRefresh?: () => void | Promise<void>;
  title?: string;
  description?: string;
};

export function ForwardQueueSidebar({
  document,
  onRefresh,
  title = 'Izoh va yo‘naltirish',
  description = 'Izoh qoldiring va foydalanuvchilarga navbat bilan yuboring',
}: Props) {
  const { users, province, organ, department, loading: peersLoading } =
    useDepartmentPeers();
  const [comment, setComment] = useState(document.forwardedComment ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const existingQueue = Array.isArray(document.forwardedTo) ?
    document.forwardedTo
      .filter(
        (item): item is { userId?: string; fullName?: string; order?: number; position?: string } =>
          typeof item === 'object' && item !== null && 'fullName' in item
      )
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  : [];

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ?
        prev.filter((id) => id !== userId)
      : [...prev, userId]
    );
  };

  const moveUser = (index: number, direction: 'up' | 'down') => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleForward = async () => {
    if (selectedIds.length === 0) {
      toast.error('Kamida bitta foydalanuvchini tanlang');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return toast.error('Token topilmadi!');

      const res = await fetch(`/api/documents/${document._id}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: comment.trim(),
          userIds: selectedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success(data.message || 'Hujjat yo‘naltirildi');
      await onRefresh?.();
    } catch {
      toast.error('Server xatosi!');
    } finally {
      setSubmitting(false);
    }
  };

  const saveCommentOnly = async () => {
    if (!comment.trim()) return toast.error('Izoh yozilmadi!');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/documents/${document._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: comment }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Izoh saqlandi');
      await onRefresh?.();
    } catch {
      toast.error('Server xatosi!');
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-white lg:w-96">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="size-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Izoh
          </label>
          <Textarea
            placeholder="Izoh yozing..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px] resize-none rounded-xl border-slate-200 bg-slate-50/80 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={saveCommentOnly}>
            Izohni saqlash
          </Button>
        </div>

        {existingQueue.length > 0 ?
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <ListOrdered className="size-3.5" />
              Navbat (yuborilgan)
            </p>
            <ol className="space-y-1 text-xs text-slate-700">
              {existingQueue.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-[#102c50]">{i + 1}.</span>
                  <span>
                    {item.fullName}
                    {item.position ? ` — ${item.position}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Users className="size-3.5 text-sky-600" />
              Foydalanuvchilarga yo‘naltirish
            </p>
            <span className="text-[10px] text-slate-500">
              {province}
              {organ ? ` · ${organ}` : ''}
              {department && department.toLowerCase() !== 'komandir' ?
                ` · ${department}`
              : ''}
            </span>
          </div>

          {peersLoading ?
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="size-4 shrink-0 text-slate-400" />
                Foydalanuvchilar ro‘yxati tayyorlanmoqda
              </p>
            </div>
          : users.length === 0 ?
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              Bir viloyat va bir xil organ dagi boshqa foydalanuvchi topilmadi
            </p>
          : <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {users.map((u) => {
                const checked = selectedIds.includes(u.userId);
                const orderIndex = selectedIds.indexOf(u.userId);
                return (
                  <li
                    key={u.userId}
                    className={cn(
                      'flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors',
                      checked && 'bg-sky-50'
                    )}>
                    <Checkbox
                      id={`peer-${u.userId}`}
                      checked={checked}
                      onCheckedChange={() => toggleUser(u.userId)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`peer-${u.userId}`}
                      className="min-w-0 flex-1 cursor-pointer text-xs leading-snug">
                      <span className="font-medium text-slate-800">
                        {checked ?
                          <span className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-[#102c50] text-[10px] font-bold text-white">
                            {orderIndex + 1}
                          </span>
                        : null}
                        {u.fullName}
                      </span>
                      <span className="block text-slate-500">
                        {u.job?.position}
                        {u.job?.militaryRank ? ` · ${u.job.militaryRank}` : ''}
                      </span>
                    </label>
                    {checked && selectedIds.length > 1 ?
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={orderIndex === 0}
                          onClick={() => moveUser(orderIndex, 'up')}
                          className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={orderIndex === selectedIds.length - 1}
                          onClick={() => moveUser(orderIndex, 'down')}
                          className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>
                    : null}
                  </li>
                );
              })}
            </ul>
          }
        </div>

        {selectedIds.length > 0 ?
          <div className="rounded-lg border border-[#c7a75b]/30 bg-[#c7a75b]/10 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#102c50]">
              Tanlangan navbat
            </p>
            <ol className="space-y-0.5 text-xs text-slate-700">
              {selectedIds.map((id, i) => {
                const u = users.find((x) => x.userId === id);
                return (
                  <li key={id}>
                    {i + 1}. {u?.fullName ?? id}
                  </li>
                );
              })}
            </ol>
          </div>
        : null}
      </div>

      <div className="shrink-0 border-t border-slate-100 p-4">
        <Button
          disabled={submitting || selectedIds.length === 0}
          onClick={handleForward}
          className="w-full gap-2 rounded-md bg-[#102c50] text-white transition-colors duration-150 hover:bg-[#173c68]">
          {submitting ?
            <Loader2 className="size-4 animate-spin" />
          : <Send className="size-4" />}
          Navbat bilan yuborish
        </Button>
      </div>
    </aside>
  );
}
