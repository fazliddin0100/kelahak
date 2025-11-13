"use client";

import { motion } from "framer-motion";
import {BookOpenCheck, Folder, Undo2} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {openDocument} from "@/utils/openDocument";
import { DocumentType } from '@/types/document';

interface AmallarButtonsProps {
    document: DocumentType;
    onRegister?: () => void;
    onReturn?: () => void;
}

export default function AmallarButtons({
                                           document,
                                       }: AmallarButtonsProps) {
    return (
        <>
            {/*hujjatni korish*/}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                                onClick={() => openDocument(document)}
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Folder className="size-7 text-blue-500" />
                                </motion.div>

                                {/* Fancy hover glow effect */}
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>

                    {/* Tooltip content */}
                    <TooltipContent side="top" className="text-sm font-medium">
                        Ko`rish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {/*royxatga olish*/}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex  mx-2"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <BookOpenCheck className="size-7 text-blue-500" />
                                </motion.div>
                                {/* Fancy hover glow effect */}
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>

                    {/* Tooltip content */}
                    <TooltipContent side="top" className="text-sm font-medium">
                        Ro`yxatga olish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {/*egasiha qaytarish*/}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex "
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Undo2 className="size-7 text-blue-500" />
                                </motion.div>
                                {/* Fancy hover glow effect */}
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>

                    {/* Tooltip content */}
                    <TooltipContent side="top" className="text-sm font-medium">
                        Hujjatni qaytarish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>

    );
}
