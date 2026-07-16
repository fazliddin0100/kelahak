"use client";

import {useMemo, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDocumentFormUsers } from '@/hooks/useDocumentFormUsers';
import {IUserPopulated} from "@/types/user";

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: ({
                 sender,
                 receivers,
             }: {
        sender: IUserPopulated | null;
        receivers: IUserPopulated[];
    }) => void;
}

const BuyruqniTasdiqlashModal = ({open, onClose, onSave}: Props) => {
    const [senderId, setSenderId] = useState<string | undefined>(undefined);
    const [receiverIds, setReceiverIds] = useState<string[]>([]);
    const { users, loading } = useDocumentFormUsers(open, 'organ');

    const userOptions = useMemo(
        () =>
            users.map((user) => ({
                value: user.userId,
                label: `${user.personal?.fName ?? ''} ${user.personal?.name ?? ''} ${user.personal?.sName ?? ''} (${user.job?.position ?? ''})`.trim(),
            })),
        [users]
    );

    const handleSave = () => {
        const sender = users.find((user) => user.userId === senderId) || null;
        const receivers = users.filter((user) => receiverIds.includes(user.userId));
        onSave({sender, receivers});
        onClose();
    };

    const toggleReceiver = (id: string) => {
        setReceiverIds((prev) =>
            prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="max-w-2xl w-full rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-2xl p-6 transition-all duration-300">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800 tracking-tight">
                        Buyruqni tasdiqlash
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 mt-1">
                        Buyruqni tasdiqlovchilarni tanlang, so‘ng saqlash tugmasini bosing.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <p className="text-sm text-gray-500 mt-4 animate-pulse">
                        Yuklanmoqda...
                    </p>
                ) : userOptions.length === 0 ? (
                    <p className="text-sm text-red-600 mt-4">
                        Foydalanuvchilar topilmadi. Sizning viloyat va organingizdagi boshqa
                        xodimlar ro‘yxatdan o‘tgan va ruxsat olgan bo‘lishi kerak.
                    </p>
                ) : (
                    <div className="space-y-6 mt-4">
                        {/* Sender Select */}
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700">
                                Tayyorlovchi:
                            </p>
                            <Select value={senderId || ""} onValueChange={setSenderId}>
                                <SelectTrigger
                                    className="w-full h-11 rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 shadow-sm hover:shadow-md transition">
                                    <SelectValue placeholder="Tayyorlovchini tanlang"/>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border shadow-lg bg-white">
                                    <SelectGroup>
                                        <SelectLabel className="text-gray-500 text-xs uppercase tracking-wide">
                                            Tayyorlovchilar
                                        </SelectLabel>
                                        {userOptions.map((user) => (
                                            <SelectItem
                                                key={user.value}
                                                value={user.value}
                                                className="cursor-pointer text-gray-700 hover:bg-blue-50 rounded-md px-2 py-1 transition"
                                            >
                                                {user.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Receiver Checkboxes */}
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700">
                                Buyruqni tasdiqlovchi:
                            </p>
                            <div className="space-y-2">
                                {userOptions.map((user) => {
                                    const isSelected = receiverIds.includes(user.value);
                                    return (
                                        <label
                                            key={user.value}
                                            className={`flex items-center space-x-3 cursor-pointer rounded-xl border p-3 transition ${
                                                isSelected
                                                    ? "bg-blue-50 border-blue-400 text-blue-900 shadow-sm"
                                                    : "bg-white border-gray-200 hover:bg-gray-50 hover:shadow"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleReceiver(user.value)}
                                                className="accent-blue-600 w-4 h-4"
                                            />
                                            <span className="text-sm font-medium">{user.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-6 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl px-5 h-10 border-gray-300 hover:bg-gray-100 transition"
                    >
                        Bekor qilish
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!senderId || userOptions.length === 0}
                        className="rounded-xl px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
                    >
                        Saqlash
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BuyruqniTasdiqlashModal;
