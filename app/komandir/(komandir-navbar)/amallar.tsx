'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/document';
import { FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AmallarButtonsProps {
  document: DocumentType;
}

export default function AmallarButtons({ document }: AmallarButtonsProps) {
  const router = useRouter();

  const openDocumentPage = () => {
    router.push(`/document-open/${document._id}?from=komandir`);
  };

  return (
    <TooltipProvider delayDuration={200}>
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
    </TooltipProvider>
  );
}
