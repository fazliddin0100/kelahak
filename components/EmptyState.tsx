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
  <div className="flex flex-col items-center justify-center py-16 px-8">
    <div className="relative flex items-center justify-center w-24 h-24 animate-float">
      <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse-ring" />
      <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse-ring [animation-delay:1.1s]" />
      {/* ✅ w-18 → w-16 ga o'zgartirildi */}
      <div className="relative z-10 w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center p-4">
        <FolderOpen className="w-8 h-8 text-blue-500" />
      </div>
    </div>

    <p className="mt-6 text-base font-medium text-gray-800 animate-fadeUp">
      {title}
    </p>
    <p className="mt-2 text-sm text-gray-500 text-center max-w-[260px] leading-relaxed [animation-delay:200ms] animate-fadeUp">
      {description}
    </p>

    <div className="flex flex-col gap-2 mt-8 w-full max-w-xs [animation-delay:400ms] animate-fadeUp">
      <div className="h-2 w-3/4 rounded-full bg-gray-100 animate-pulse" />
      <div className="h-2 w-1/2 rounded-full bg-gray-100 animate-pulse [animation-delay:300ms]" />
      <div className="h-2 w-2/3 rounded-full bg-gray-100 animate-pulse [animation-delay:600ms]" />
    </div>
  </div>
);

export default EmptyState;
