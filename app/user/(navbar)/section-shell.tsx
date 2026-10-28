import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface SectionShellProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionShell({
  title,
  description,
  icon: Icon,
  iconClassName = 'bg-slate-100 text-[#102c50]',
  children,
  actions,
  className,
}: SectionShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6',
        className
      )}>
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
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              {description && (
                <p className="text-xs text-slate-500">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </section>
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  icon,
  iconClassName,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <SectionShell
      title={title}
      description={description}
      icon={icon}
      iconClassName={iconClassName}>
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
        <p className="text-sm font-medium text-slate-600">{description}</p>
        <p className="text-xs text-slate-400">Tez orada qo‘shiladi</p>
      </div>
    </SectionShell>
  );
}

export const userThClass =
  'whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';

export const userTdClass = 'px-3 py-2.5 text-sm text-slate-700 align-top';
