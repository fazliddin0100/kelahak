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
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import ShareUserModal from '@/components/modals/ShareUserModal';
import { useState } from 'react';

interface AmallarButtonsProps {
    document: DocumentType;
}

export default function DocumentOpenButtons({ document }: AmallarButtonsProps) {
    const router = useRouter();
    const [shareOpen, setShareOpen] = useState(false);

    const status = document.status as DocumentStatus;

    // ✅ faqat REGISTERED gacha o‘zgartirish mumkin
    const canEdit = [
        DocumentStatus.YANGI,
        DocumentStatus.CREATED,
        DocumentStatus.SIGNED,
    ].includes(status);

    // ✅ Imzolash faqat YANGI va CREATED bosqichida
    const canSign = [DocumentStatus.YANGI, DocumentStatus.CREATED].includes(status);

    const hendlerUpdateDocument = (id: string) => {
        router.push(`/document/${id}`);
    };

    const hendlerSignedDocument = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Token topilmadi!');
                return;
            }
            const res = await fetch(`/api/documents/${id}/signed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Xatolik!');
                return;
            }
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
            if (!token) {
                toast.error('Token topilmadi!');
                return;
            }
            const res = await fetch(`/api/documents/${id}/nomeklatura`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Xatolik!');
                return;
            }
            toast.success('Hujjat nomeklaturaga tikildi!');
            router.refresh();
        } catch (err) {
            toast.error('Server xatosi!');
            console.error(err);
        }
    };

    return (
        <>
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
                                className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all
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
                                className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all
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

            {/* Yuborish — endi ShareUserModal ochiladi */}
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
                                onClick={() => setShareOpen(true)} // <-- modal ochiladi
                            >
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

            {/* Nomeklaturaga tikish */}
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
                                className="relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
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

            {/* ShareUserModal qo'shildi */}
            <ShareUserModal
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                documentId={document._id}
            />
        </>
    );
}
