import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export const modalTriggerPrimary =
  'gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100';

export const modalTriggerSecondary =
  'gap-2 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100';

export const modalTriggerAccent =
  'gap-2 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100';

export const modalContentClass =
  'gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl';

export const modalContentWideClass = cn(
  modalContentClass,
  'max-h-[90vh] sm:max-w-5xl'
);

export const modalContentFormClass = cn(
  modalContentClass,
  'max-h-[90vh] sm:max-w-[800px]'
);

export const modalFieldClass =
  'border-slate-200 bg-slate-50/50 focus-visible:border-sky-400 focus-visible:ring-sky-500/20';

export const modalLabelClass = 'text-xs font-medium uppercase tracking-wide text-slate-500';

export function ModalHeaderBlock({
  icon: Icon,
  title,
  description,
  iconClassName = 'bg-indigo-500/10 text-indigo-600',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      {description ?
        <DialogDescription className="sr-only">{description}</DialogDescription>
      : null}
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          iconClassName
        )}>
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-800" aria-hidden="true">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500" aria-hidden="true">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-4 overflow-y-auto px-6 py-5', className)}>
      {children}
    </div>
  );
}

export function ModalFooterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
      {children}
    </div>
  );
}

export function ModalField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className={modalLabelClass}>{label}</label>
      {children}
    </div>
  );
}

export function ModalLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <span className="size-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      Yuklanmoqda...
    </div>
  );
}
