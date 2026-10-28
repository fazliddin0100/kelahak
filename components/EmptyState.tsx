'use client';

import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState = ({
  title = "Ma'lumot mavjud emas",
  description = "Hozircha ro'yxatda hujjat yo'q. Yangi hujjatlar qo'shilganda bu yerda ko'rinadi.",
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center px-8 py-16">
    <div className="flex size-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 p-4">
        <FolderOpen className="size-8 text-[#102c50]" />
      </div>

    <p className="mt-6 text-base font-medium text-slate-800">
      {title}
    </p>
    <p className="mt-2 max-w-[260px] text-center text-sm leading-relaxed text-slate-500">
      {description}
    </p>
  </div>
);

export default EmptyState;
