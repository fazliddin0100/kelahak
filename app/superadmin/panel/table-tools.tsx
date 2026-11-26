'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

/** Katta ro'yxatlar uchun: qidiruv matnini normallashtirish (katta-kichik harf, apostroflar) */
export const normalizeSearch = (v: string) =>
  v
    .toLowerCase()
    .replace(/[‘’ʼ`ʻ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Qidiruv (har bir so'z topilishi kerak) + sahifalash */
export function useSearchPaging<T>(items: T[], haystack: (item: T) => string, pageSize = 25) {
  const [query, setQueryState] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const words = normalizeSearch(query).split(' ').filter(Boolean);
    if (words.length === 0) return items;
    return items.filter((it) => {
      const text = normalizeSearch(haystack(it));
      return words.every((w) => text.includes(w));
    });
  }, [items, query, haystack]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * pageSize, (current + 1) * pageSize);

  return {
    query,
    setQuery: (v: string) => {
      setQueryState(v);
      setPage(0);
    },
    rows,
    total: filtered.length,
    page: current,
    pageCount,
    pageSize,
    setPage,
  };
}

export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-8 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Qidiruvni tozalash"
          className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function TablePager({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const btn =
    'inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-xs text-slate-500">
      <span>
        {from}–{to} / {total}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Oldingi sahifa">
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[64px] text-center tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={btn}
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Keyingi sahifa">
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Kichik holat belgisi (jadval uchun ixcham) */
export function StatusPill({ tone, children, title }: { tone: 'green' | 'red' | 'amber' | 'slate'; children: ReactNode; title?: string }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    slate: 'bg-slate-50 text-slate-600 ring-slate-200',
  };
  return (
    <span title={title} className={cn('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', tones[tone])}>
      {children}
    </span>
  );
}
