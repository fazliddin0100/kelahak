import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import LoadingState from '@/components/LoadingState';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export const modalTriggerPrimary =
  'gap-2 border-[#102c50]/20 bg-[#102c50]/5 text-[#102c50] hover:bg-[#102c50]/10';

export const modalTriggerSecondary =
  'gap-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';

export const modalTriggerAccent =
  'gap-2 border-[#c7a75b]/40 bg-[#c7a75b]/10 text-[#102c50] hover:bg-[#c7a75b]/20';

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
  'border-slate-200 bg-slate-50/50 focus-visible:border-[#c7a75b] focus-visible:ring-[#c7a75b]/20';

export const modalLabelClass = 'text-xs font-medium uppercase tracking-wide text-slate-500';

export function ModalHeaderBlock({
  icon: Icon,
  title,
  description,
  iconClassName = 'bg-slate-100 text-[#102c50]',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
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
        <h3 className="text-base font-semibold text-slate-900" aria-hidden="true">
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
  return <LoadingState className="py-4" />;
}
