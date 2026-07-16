'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { CheckCircle2, FolderOpen, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AmallarButtonsProps {
  document: DocumentType;
  onRefresh?: () => void | Promise<void>;
}

export default function AmallarButtons({
  document,
  onRefresh,
}: AmallarButtonsProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  const isAccepted =
    document.status === DocumentStatus.ACCEPTED ||
    document.ownerAccepted === true;
  const canAccept =
    document.status === DocumentStatus.REGISTERED && !isAccepted;

  const openDocumentPage = () => {
    router.push(`/document-open/${document._id}`);
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Avval tizimga kiring');
        return;
      }

      const res = await fetch(`/api/documents/${document._id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Qabul qilishda xatolik');
        return;
      }
      toast.success(data.message || 'Hujjat qabul qilindi');
      await onRefresh?.();
    } catch {
      toast.error('Server xatosi');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-center gap-1">
        {canAccept ?
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={accepting}
                className={cn(
                  'size-8 rounded-lg border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm',
                  'transition-all hover:scale-105 hover:bg-emerald-100'
                )}
                onClick={handleAccept}>
                {accepting ?
                  <Loader2 className="size-4 animate-spin" />
                : <CheckCircle2 className="size-4" strokeWidth={2} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Qabul qilish (bir marta)
            </TooltipContent>
          </Tooltip>
        : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'size-8 rounded-lg border-sky-200 bg-sky-50 text-sky-700 shadow-sm',
                'transition-all hover:scale-105 hover:bg-sky-100 hover:shadow-md'
              )}
              onClick={openDocumentPage}>
              <FolderOpen className="size-4" strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Hujjatni ochish
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
