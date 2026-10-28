import { cn } from '@/lib/utils';
import mexonMark from '@/public/mexon-mark.png';
import Image from 'next/image';

interface LoadingStateProps {
  message?: string;
  className?: string;
  compact?: boolean;
  fullScreen?: boolean;
}

export default function LoadingState({
  message = 'Yuklanmoqda...',
  className,
  compact = false,
  fullScreen = false,
}: LoadingStateProps) {
  if (compact) {
    return (
      <span
        role="status"
        aria-label={message}
        className={cn(
          'relative inline-flex size-7 items-center justify-center',
          className
        )}>
        <span
          className="absolute inset-0 animate-[spin_5s_linear_infinite] motion-reduce:animate-none"
          aria-hidden="true"
        >
          <span className="absolute left-1/2 top-0 size-1 -translate-x-1/2 rounded-full bg-[#c7a75b]" />
          <span className="absolute right-0.5 top-1/2 size-1 -translate-y-1/2 rounded-full bg-[#c7a75b]/70" />
          <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#c7a75b]/45" />
          <span className="absolute left-0.5 top-1/2 size-1 -translate-y-1/2 rounded-full bg-[#c7a75b]/70" />
        </span>
        <Image
          src={mexonMark}
          alt=""
          width={mexonMark.width}
          height={mexonMark.height}
          className="relative h-5 w-7 object-contain"
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        className,
        fullScreen ?
          'fixed inset-0 z-100 flex min-h-screen items-center justify-center bg-background/25 px-4 py-8 backdrop-blur-sm'
        : 'flex items-center justify-center py-8'
      )}>
      <div className="relative flex size-28 items-center justify-center opacity-90">
        <span
          className="absolute inset-0 animate-[spin_5s_linear_infinite] motion-reduce:animate-none"
          aria-hidden="true"
        >
          <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-[#e4c474]" />
          <span className="absolute right-1 top-1/4 size-1.5 rounded-full bg-[#e4c474]/70" />
          <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#e4c474]/50" />
          <span className="absolute bottom-1/4 right-1 size-1.5 rounded-full bg-[#e4c474]/35" />
          <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[#e4c474]/30" />
          <span className="absolute bottom-1/4 left-1 size-1.5 rounded-full bg-[#e4c474]/35" />
          <span className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#e4c474]/50" />
          <span className="absolute left-1 top-1/4 size-1.5 rounded-full bg-[#e4c474]/70" />
        </span>
        <Image
          src={mexonMark}
          alt=""
          width={mexonMark.width}
          height={mexonMark.height}
          preload
          className="relative z-10 h-12 w-[4.7rem] object-contain drop-shadow-[0_0_14px_rgba(228,196,116,0.35)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
