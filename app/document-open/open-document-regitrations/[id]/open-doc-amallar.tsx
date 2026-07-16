'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRoleHook } from '@/hooks/useRoleHook';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { motion } from 'framer-motion';
import { House, Signature } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AmallarButtonsProps {
  document: DocumentType;
}

export default function DocumentOpenButtons({ document }: AmallarButtonsProps) {
  const router = useRouter();
  const { role } = useRoleHook();

  const currentRole = Array.isArray(role) ? role[0] : role;

  const status = document.status as DocumentStatus;

  const canEdit = [
    DocumentStatus.YANGI,
    DocumentStatus.CREATED,
    DocumentStatus.SIGNED,
  ].includes(status);

  const canSign = [
    DocumentStatus.YANGI,
    DocumentStatus.CREATED,
    DocumentStatus.SIGNED,
  ].includes(status);

  // // ozgartirish
  // const hendlerUpdateDocument = (id: string) => {
  //   router.push(`/document/${id}`);
  // };

  // royxatga olish funccsiyasi
  const hendlerRegDocument = async (id: string) => {
    console.log('id: ', id);
    try {
      const token = localStorage.getItem('token');
      if (!token) return toast.error('Token topilmadi!');

      const res = await fetch(`/api/documents/${id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success('Hujjat ro`yxatga olindi!');
      router.refresh();
    } catch (err) {
      toast.error('Server xatosi!');
      console.error(err);
    }
  };

  return (
    <div className="flex flex-row items-end justify-between w-full">
      {/* Chap taraf — Bosh sahifa tugmasi */}
      <Link
        href={
          currentRole === 'admin' ? '/kotibiyat'
          : currentRole === 'user' ?
            '/user'
          : currentRole === 'commander' ?
            '/komandir'
          : '/'
        }>
        <Button className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
          <House className="w-4 h-4" />
          Bosh sahifa
        </Button>
      </Link>

      {/* O‘ng taraf — ikkita harakat tugmasi */}
      <div className="flex items-center gap-2">
        {/* O'zgartirish */}
        {/* <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canEdit}
                  className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 
                bg-white px-3 py-2 shadow-sm transition-all
                ${
                  !canEdit ?
                    'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-gray-300 hover:bg-gray-50'
                }`}
                  onClick={() => hendlerUpdateDocument(document._id)}>
                  <motion.div
                    whileHover={{ rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 300 }}>
                    <FilePenLine className="size-5 text-orange-600" />
                  </motion.div>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>O‘zgartirish</TooltipContent>
          </Tooltip>
        </TooltipProvider> */}

        {/* Ro'yxatga olish */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canSign}
                  className={`relative flex items-center gap-2 rounded-2xl border border-gray-100 
                bg-white px-3 py-2 shadow-sm transition-all
                ${
                  !canSign ?
                    'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-gray-300 hover:bg-gray-50'
                }`}
                  onClick={() => hendlerRegDocument(document._id)}>
                  <motion.div
                    whileHover={{ rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 300 }}>
                    <Signature className="size-5 text-green-800" />
                  </motion.div>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Ro‘yxatga olish</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
