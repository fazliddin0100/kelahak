'use client';

import { motion } from 'framer-motion';
import { FilePenLine, Notebook, Send, Signature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import ShareUserModal from '@/components/modals/ShareUserModal';
import { useState } from 'react';
import { House } from 'lucide-react';
import Link from 'next/link';
import { useRoleHook } from '@/hooks/useRoleHook';

interface AmallarButtonsProps {
  document: DocumentType;
}

export default function DocumentOpenButtons({ document }: AmallarButtonsProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [comment, setComment] = useState('');
  const { role } = useRoleHook();

  const currentRole = Array.isArray(role) ? role[0] : role;

  const status = document.status as DocumentStatus;

  const canEdit = [
    DocumentStatus.YANGI,
    DocumentStatus.CREATED,
    DocumentStatus.SIGNED,
  ].includes(status);

  const canSign = [DocumentStatus.YANGI, DocumentStatus.CREATED].includes(
    status
  );

  const hendlerUpdateDocument = (id: string) => {
    router.push(`/document/${id}`);
  };

  const hendlerSignedDocument = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return toast.error('Token topilmadi!');

      const res = await fetch(`/api/documents/${id}/signed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');

      toast.success('Hujjat imzolandi!');
      router.refresh();
    } catch (err) {
      toast.error('Server xatosi!');
      console.error(err);
    }
  };

  const hendlerGetNomeklatura = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return toast.error('Token topilmadi!');

      const res = await fetch(`/api/documents/${id}/nomeklatura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');

      toast.success('Hujjat nomeklaturaga tikildi!');
      router.refresh();
    } catch (err) {
      toast.error('Server xatosi!');
      console.error(err);
    }
  };

  const hendlerAddComment = async (id: string) => {
    if (!comment.trim()) return toast.error('Komment yozilmadi!');

    try {
      const token = localStorage.getItem('token');
      if (!token) return toast.error('Token topilmadi!');

      const res = await fetch(`/api/documents/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: comment }),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Xatolik!');

      toast.success('Komment qo‘shildi!');
      setComment('');
      router.refresh();
    } catch (err) {
      toast.error('Server xatosi!');
      console.error(err);
    }
  };

  return (
    <div className={'flex flex-row items-start justify-center'}>
      <Link
        href={
          currentRole === 'admin'
            ? '/kotibiyat'
            : currentRole === 'user'
            ? '/user'
            : currentRole === 'commander'
            ? '/komandir'
            : '/'
        }>
        <Button className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
          <House className="w-4 h-4" />
          Bosh sahifa
        </Button>
      </Link>
      <div className="min-w-full">
        {/* O'zgartirish */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex mx-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canEdit}
                  className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 
                                        bg-white px-3 py-2 shadow-sm transition-all
                                        ${
                                          !canEdit
                                            ? 'opacity-50 cursor-not-allowed'
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
        </TooltipProvider>

        {/* Imzolash */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex mr-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canSign}
                  className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 
                                        bg-white px-3 py-2 shadow-sm transition-all
                                        ${
                                          !canSign
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:shadow-md hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                  onClick={() => hendlerSignedDocument(document._id)}>
                  <motion.div
                    whileHover={{ rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 300 }}>
                    <Signature className="size-5 text-green-600" />
                  </motion.div>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Imzolash</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Yuborish */}
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
                  className="relative flex items-center gap-2 rounded-2xl border border-gray-200
                                        bg-white px-3 py-2 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                  onClick={() => setShareOpen(true)}>
                  <motion.div
                    whileHover={{ rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 300 }}>
                    <Send className="size-5 text-blue-600" />
                  </motion.div>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Yuborish</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Nomeklatura */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex mx-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="relative flex items-center gap-2 rounded-2xl border border-gray-200
                                        bg-white px-3 py-2 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                  onClick={() => hendlerGetNomeklatura(document._id)}>
                  <motion.div
                    whileHover={{ rotate: -10 }}
                    transition={{ type: 'spring', stiffness: 300 }}>
                    <Notebook className="size-5 text-black" />
                  </motion.div>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Nomeklaturaga tikish</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="min-w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mt-6 p-4 rounded-xl border border-gray-200
                   bg-linear-to-r from-gray-50 to-white
                   shadow-md hover:shadow-lg max-w-4xl mx-auto">
            <Textarea
              placeholder="Komment yozing..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full h-[400px] resize-none
                       focus:ring-2 focus:ring-blue-400 transition-all"
            />

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-3">
              <Button
                onClick={() => hendlerAddComment(document._id)}
                className="w-full rounded-lg bg-blue-600
                           text-white hover:bg-blue-700">
                Izoh qo`shish
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <ShareUserModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          documentId={document._id}
        />
      </div>
    </div>
  );
}
