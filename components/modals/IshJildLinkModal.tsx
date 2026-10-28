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
import type { BolinmaWithNomeklatura, NomeklaturaItem } from '@/hooks/useNomeklatura';
import { USER_NOMEKLATURA_RELATION_LABEL } from '@/lib/userNomeklaturaLabels';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveId(id: NomeklaturaItem['_id']): string {
  if (!id) return '';
  return typeof id === 'string' ? id : id.$oid;
}

type Props = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onLinked?: () => void | Promise<void>;
};

export default function IshJildLinkModal({
  open,
  onClose,
  documentId,
  onLinked,
}: Props) {
  const [groups, setGroups] = useState<BolinmaWithNomeklatura[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadNomeklatura = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nameklatura/get-users-nomeklatura', {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Nomeklatura yuklanmadi');
      }
      setGroups(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Nomeklatura ro‘yxati yuklanmadi'
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setSearch('');
      loadNomeklatura();
    }
  }, [open, loadNomeklatura]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((g) => ({
        ...g,
        nomeklaturalar: g.nomeklaturalar.filter((item) => {
          const title = (item.title ?? '').toLowerCase();
          const reg = String(item.registrationIndex ?? '').toLowerCase();
          const grif = (item.grif ?? '').toLowerCase();
          const bolinma = (g.bolinma ?? '').toLowerCase();
          return (
            title.includes(q) ||
            reg.includes(q) ||
            grif.includes(q) ||
            bolinma.includes(q)
          );
        }),
      }))
      .filter((g) => g.nomeklaturalar.length > 0);
  }, [groups, search]);

  const totalCount = useMemo(
    () => groups.reduce((n, g) => n + g.nomeklaturalar.length, 0),
    [groups]
  );

  const handleSubmit = async () => {
    if (!selectedId) {
      toast.error('Ish jildni tanlang');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/nomeklatura`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ nomeklaturaId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Ish jildga yuborishda xatolik');
      }
      toast.success(data.message || 'Hujjat ish jildga yuborildi');
      onClose();
      await onLinked?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle>Ish jildga yuborish</DialogTitle>
          <DialogDescription>
            Hujjatni biriktirish uchun o‘z nomingizdagi ish jildni tanlang
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-3">
          <input
            type="search"
            placeholder="Indeks, nom yoki grif bo‘yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto px-5 py-3">
          {loading ?
            <LoadingState message="Ish jildlar yuklanmoqda..." className="py-4" />
          : totalCount === 0 ?
            <p className="py-8 text-center text-sm text-slate-500">
              Sizga tegishli ish jild topilmadi. Avval nomeklatura yarating.
            </p>
          : filteredGroups.length === 0 ?
            <p className="py-8 text-center text-sm text-slate-500">
              Qidiruv bo‘yicha natija yo‘q
            </p>
          : <ul className="space-y-4">
              {filteredGroups.map((group) => (
                <li key={resolveId(group._id) || group.bolinma}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.bolinma}
                  </p>
                  <ul className="space-y-1.5">
                    {group.nomeklaturalar.map((item) => {
                      const id = resolveId(item._id);
                      const selected = selectedId === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(id)}
                            className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                              selected ?
                                'border-sky-500 bg-sky-50 ring-1 ring-sky-200'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}>
                            <span className="font-medium text-slate-800">
                              {item.registrationIndex ?
                                `${item.registrationIndex} — `
                              : ''}
                              {item.title || '—'}
                            </span>
                            <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                              {item.grif ?
                                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                  {item.grif}
                                </span>
                              : null}
                              {item.relation ?
                                <span>
                                  {
                                    USER_NOMEKLATURA_RELATION_LABEL[
                                      item.relation
                                    ]
                                  }
                                </span>
                              : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          }
        </div>

        <DialogFooter className="border-t border-slate-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Bekor
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || !selectedId}>
            {submitting ?
              <Loader2 className="size-4 animate-spin" />
            : 'Ish jildga yuborish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
