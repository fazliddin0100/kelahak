'use client';

import { cn } from '@/lib/utils';
import type { DocumentType } from '@/types/document';

type Doc = DocumentType & {
  pendingTransferToId?: string | null;
  submittedToKotibiyat?: boolean;
  sharedWithAdmin?: boolean;
};

const STEPS = ['Qoralama', 'Boshliqda', 'Tasdiqlandi', 'Kotibiyatda', 'Ro‘yxatda', 'Ish jildida'];

type Stage = { index: number; label: string; detail?: string; tone: 'neutral' | 'work' | 'ok' | 'move' };

function signed(v: unknown): boolean {
  return !!v && typeof v === 'object' && (v as { hasSigned?: boolean }).hasSigned === true;
}

/** Hujjat hozir qayerda — ro'yxatda ochmasdan ko'rish uchun */
export function resolveDocumentStage(doc: Doc): Stage {
  const status = doc.status ?? 'yangi';
  const queue = Array.isArray(doc.forwardedTo) ? (doc.forwardedTo as { fullName?: string; hasSigned?: boolean }[]) : [];
  const activeExecutor = queue.find((q) => q && !q.hasSigned)?.fullName;
  const executorDetail = activeExecutor ? `Ijrochida: ${activeExecutor}` : undefined;
  const transferDetail = doc.pendingTransferToId ? 'Topshirildi — qabul kutilmoqda' : undefined;

  if (doc.nomenclatureId || status === 'ishjildda') {
    return { index: 5, label: 'Ish jildida', tone: 'ok' };
  }
  if (doc.registrationIndex != null || status === 'registered' || status === 'qabul_qilindi') {
    return {
      index: 4,
      label: `Ro‘yxatga olindi${doc.registrationIndex != null ? ` № ${doc.registrationIndex}` : ''}`,
      detail: transferDetail ?? executorDetail,
      tone: 'ok',
    };
  }
  if (doc.submittedToKotibiyat) {
    return { index: 3, label: 'Kotibiyatda (ro‘yxatga olish)', detail: executorDetail, tone: 'move' };
  }
  if (status === 'imzolandi' || signed(doc.bosSigned)) {
    return {
      index: 2,
      label: 'Boshliq tasdiqladi',
      detail: transferDetail ?? executorDetail ?? 'Kotibiyatga yuborish mumkin',
      tone: 'ok',
    };
  }
  if (signed(doc.author) || status === 'in_progress') {
    return { index: 1, label: 'Boshliq ko‘rib chiqmoqda', tone: 'work' };
  }
  return { index: 0, label: 'Qoralama — imzolanmagan', tone: 'neutral' };
}

const TONE: Record<Stage['tone'], { dot: string; ring: string; text: string }> = {
  neutral: { dot: 'bg-slate-400', ring: 'bg-slate-300', text: 'text-slate-600' },
  work: { dot: 'bg-amber-500', ring: 'bg-amber-300', text: 'text-amber-700' },
  move: { dot: 'bg-sky-500', ring: 'bg-sky-300', text: 'text-sky-700' },
  ok: { dot: 'bg-emerald-500', ring: 'bg-emerald-300', text: 'text-emerald-700' },
};

/** Ixcham animatsiyali bosqichlar: bajarilganlar to'la, hozirgisi "puls" bilan */
export default function DocumentProgress({ document, className }: { document: Doc; className?: string }) {
  const stage = resolveDocumentStage(document);
  const tone = TONE[stage.tone];
  const pct = (stage.index / (STEPS.length - 1)) * 100;

  return (
    <div className={cn('min-w-[180px]', className)} title={STEPS.map((s, i) => `${i <= stage.index ? '✓' : '·'} ${s}`).join('\n')}>
      <div className="relative flex items-center justify-between">
        <div className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded bg-slate-200" />
        <div
          className={cn('absolute left-1 top-1/2 h-0.5 -translate-y-1/2 rounded transition-[width] duration-700 ease-out', tone.dot)}
          style={{ width: `calc(${pct}% - ${pct === 100 ? '0.5rem' : '0px'})` }}
        />
        {STEPS.map((step, i) => (
          <span key={step} className="relative flex size-2.5 items-center justify-center" aria-hidden>
            {i === stage.index && stage.index < STEPS.length - 1 && (
              <span className={cn('absolute inline-flex size-3.5 animate-ping rounded-full opacity-60', tone.ring)} />
            )}
            <span
              className={cn(
                'relative inline-flex size-2.5 rounded-full border-2 border-white transition-colors duration-500',
                i <= stage.index ? tone.dot : 'bg-slate-300'
              )}
            />
          </span>
        ))}
      </div>
      <p className={cn('mt-1.5 truncate text-xs font-medium', tone.text)}>{stage.label}</p>
      {stage.detail && <p className="truncate text-[11px] text-slate-500">{stage.detail}</p>}
      <span className="sr-only">Hujjat bosqichi: {stage.label}</span>
    </div>
  );
}
