'use client';

import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DocumentType } from '@/types/document';
import { useRouter } from 'next/navigation';

interface AmallarButtonsProps {
  document: DocumentType;
}

export default function AmallarButtons({ document }: AmallarButtonsProps) {
  const router = useRouter();

  // Hujjatni ko'rish
  const openDocumentPage = () => {
    router.push(`/document-open/${document._id}`);
  };

  return (
    <>
      {/* Ko'rish */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                onClick={openDocumentPage}>
                <motion.div
                  whileHover={{ rotate: -10 }}
                  transition={{ type: 'spring', stiffness: 300 }}>
                  <Folder className="size-5 text-blue-950" />
                </motion.div>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Ko‘rish</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
