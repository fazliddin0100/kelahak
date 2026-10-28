import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export function SaSectionShell({
  title,
  description,
  icon: Icon,
  iconClassName = 'bg-slate-100 text-[#102c50]',
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                iconClassName
              )}>
              <Icon className="size-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
              {description && (
                <p className="text-xs text-slate-500">{description}</p>
              )}
            </div>
          </div>
          {actions}
        </div>
        {children}
      </section>
    </div>
  );
}
