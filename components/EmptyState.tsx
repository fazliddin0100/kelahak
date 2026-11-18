'use client';

import { AlertTriangle, FolderOpen, RotateCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState = ({
  title = "Ma'lumot mavjud emas",
  description = "Hozircha ro'yxatda hujjat yo'q. Yangi hujjatlar qo'shilganda bu yerda ko'rinadi.",
}: EmptyStateProps) => (
  <div className="sticky left-0 flex w-full max-w-[calc(100vw-5rem)] flex-col items-center justify-center whitespace-normal px-8 py-16 md:max-w-[calc(100vw-var(--institutional-nav-width,0px)-6rem)]">
    <div className="flex size-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 p-4">
      <FolderOpen className="size-8 text-primary" />
    </div>

    <p className="mt-6 text-base font-medium text-slate-800">{title}</p>
    <p className="mt-2 max-w-[260px] text-center text-sm leading-relaxed text-slate-500">
      {description}
    </p>
  </div>
);

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title = "Ma'lumotni yuklab bo'lmadi",
  description = "Internet yoki server bilan aloqani tekshirib, qayta urinib ko'ring.",
  onRetry,
}: ErrorStateProps) => (
  <div role="alert" className="sticky left-0 flex w-full max-w-[calc(100vw-5rem)] flex-col items-center justify-center whitespace-normal px-8 py-16 md:max-w-[calc(100vw-var(--institutional-nav-width,0px)-6rem)]">
    <div className="flex size-16 items-center justify-center rounded-full border border-red-200 bg-red-50 p-4">
      <AlertTriangle className="size-8 text-red-600" />
    </div>
    <p className="mt-6 text-base font-medium text-slate-800">{title}</p>
    <p className="mt-2 max-w-[300px] text-center text-sm leading-relaxed text-slate-500">
      {description}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">
        <RotateCw className="size-4" />
        Qayta urinish
      </button>
    )}
  </div>
);

export default EmptyState;
