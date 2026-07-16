'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FolderOpen, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface JurnalSectionHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  count?: number;
}

export function JurnalSectionHeader({
  title,
  description,
  icon: Icon,
  count,
}: JurnalSectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
          <Icon className="size-5" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {count !== undefined && (
        <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          Jami: {count} ta
        </span>
      )}
    </div>
  );
}

export function JurnalTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="max-h-[calc(100vh-260px)] min-h-[360px] overflow-auto">
        {children}
      </div>
    </div>
  );
}

interface JurnalViewButtonProps {
  documentId?: string;
  className?: string;
  /** Ro‘yxatga olingan nusxa uchun alohida sahifa */
  registration?: boolean;
}

export function JurnalViewButton({
  documentId,
  className,
  registration = false,
}: JurnalViewButtonProps) {
  const router = useRouter();

  const openDocument = () => {
    if (!documentId) return;
    const path =
      registration ?
        `/document-open/open-document-regitrations/${documentId}`
      : `/document-open/${documentId}`;
    router.push(path);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={!documentId}
            onClick={openDocument}
            className={cn(
              'size-8 rounded-lg border-sky-200 bg-sky-50 text-sky-700 shadow-sm transition-all hover:bg-sky-100 hover:shadow-md disabled:opacity-40',
              className
            )}>
            <FolderOpen className="size-4" strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Hujjatni ochish
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const jurnalThClass =
  'whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center';

export const jurnalTdClass = 'px-3 py-2.5 text-sm text-slate-700 align-top';
