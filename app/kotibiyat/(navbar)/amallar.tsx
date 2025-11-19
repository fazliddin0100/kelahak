"use client";

import { motion } from "framer-motion";
import {FilePenLine, Folder, Notebook, Signature, Undo2} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentType } from "@/types/document";
import {DocumentStatus} from "@/types/document-status.enum";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";

interface AmallarButtonsProps {
    document: DocumentType;
    onRegister?: () => void;
    onReturn?: () => void;
}

export default function AmallarButtons({ document }: AmallarButtonsProps) {
    const router = useRouter();

    const openDocumentPage = () => {
        router.push(`/document-open/${document._id}`); // ✅ string
    };

    // royxatdan otkazish
    const hendlerRegistrationDocument = async (id: string) => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                toast.error("Token topilmadi! Avval tizimga kiring.");
                return;
            }
            const res = await fetch(`/api/documents/${id}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Xatolik!");
                return;
            }
            toast.success("Hujjat ro‘yxatga olindi!");
            router.refresh();
        } catch (err) {
            toast.error("Server xatosi!");
            console.error(err);
        }
    };

    // orqaga qaytarish otkazish
    const hendlerBackDocument = async (id: string) => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                toast.error("Token topilmadi! Avval tizimga kiring.");
                return;
            }
            const res = await fetch(`/api/documents/${id}/back-doc`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Xatolik!");
                return;
            }
            toast.success("Hujjat egasiga qaytarildi!");
            router.refresh();
        } catch (err) {
            toast.error("Server xatosi!");
            console.error(err);
        }
    };

    // imzolash
    const hendlerSignedDocument = async (id: string) => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                toast.error("Token topilmadi! Avval tizimga kiring.");
                return;
            }
            const res = await fetch(`/api/documents/${id}/signed`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Xatolik!");
                return;
            }
            toast.success("Hujjat imzolandi!");
            router.refresh();
        } catch (err) {
            toast.error("Server xatosi!");
            console.error(err);
        }
    };
    const isSignButtonDisabled = document.status !== DocumentStatus.YANGI;

    // nomeklaturaga tikish
    const hendlerGetNomeklatura = async (id: string) => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                toast.error("Token topilmadi! Avval tizimga kiring.");
                return;
            }
            const res = await fetch(`/api/documents/${id}/nomeklatura`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Xatolik!");
                return;
            }
            toast.success("Hujjat nomeklaturaga tikildi!");
            router.refresh();
        } catch (err) {
            toast.error("Server xatosi!");
            console.error(err);
        }
    };

    return (
        <>
            {/* Hujjatni ko‘rish */}
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
                                onClick={openDocumentPage}
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Folder className="size-5 text-blue-950 " />
                                </motion.div>
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm font-medium">
                        Ko‘rish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Ro‘yxatga olish */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex mx-2"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={document.status !== DocumentStatus.SIGNED}
                                className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 
                                ${document.status !== DocumentStatus.SIGNED
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                                }`}
                                onClick={() => {
                                    if (document.status === DocumentStatus.SIGNED) {
                                        hendlerRegistrationDocument(document._id);
                                    }
                                }}
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <FilePenLine className="size-5 text-blue-500" />
                                </motion.div>
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm font-medium">
                        Ro‘yxatga olish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* imzolash */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex mr-2"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isSignButtonDisabled}
                                className={`relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-300
                                ${isSignButtonDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                                }`}
                                onClick={() => {
                                    if (!isSignButtonDisabled) hendlerSignedDocument(document._id);
                                }}
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Signature className="size-5 text-green-600" />
                                </motion.div>
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm font-medium">
                        Imzolash
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Egasiha qaytarish */}
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
                                onClick={() => hendlerBackDocument(document._id)}
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Undo2 className="size-5 text-black" />
                                </motion.div>
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm font-medium">
                        Qaytarish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* nameklaturaga tikish */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex mx-2"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
                                onClick={() => hendlerGetNomeklatura(document._id)}
                            >
                                <motion.div
                                    initial={{ rotate: 0 }}
                                    whileHover={{ rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Notebook className="size-5 text-black" />
                                </motion.div>
                                <motion.span
                                    className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 blur-md"
                                    whileHover={{ opacity: 0.4, scale: 1.1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </Button>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm font-medium">
                        Nameklaturaga tikish
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>
    );
}
