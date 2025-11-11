"use client";

import {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useSessionsUsers} from "@/hooks/useSessionsUsers";

// Approver tip
interface Approver {
    userId: string;
    fullName: string;
    militaryRank: string;
    position: string;
}

// Backenddan keladigan user tip
interface UserFromApi {
    userId: string;
    personal: {
        _id: string;
        fName: string;
        name: string;
        sName: string;
        province: string;
        createdAt: string;
        updatedAt: string;
    };
    job: {
        _id: string;
        department: string;
        position: string;
        organ: string;
        militaryRank: string;
        role: string;
        isUserTrue: boolean;
        createdAt: string;
        updatedAt: string;
    };
}

interface ImzoQoshishModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (mainApprover: Approver | null, additionalApprovers: Approver[]) => void;
}

export default function ImzoQoshishModal({
                                             open,
                                             onClose,
                                             onSave,
                                         }: ImzoQoshishModalProps) {
    const [mainApprover, setMainApprover] = useState<Approver | null>(null);
    const [approverCount, setApproverCount] = useState<number>(0);
    const [additionalApprovers, setAdditionalApprovers] = useState<Approver[]>([]);
    const {users} = useSessionsUsers();

    // Modal ochilib-yopilganda state reset qilish
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            onClose();
        } else {
            setMainApprover(null);
            setApproverCount(0);
            setAdditionalApprovers([]);
        }
    };

    const handleSelectMain = (userId: string) => {
        const user = users.find((u: UserFromApi) => u.userId === userId);
        if (!user) return;
        setMainApprover({
            userId: user.userId,
            fullName: `${user.personal.fName} ${user.personal.name} ${user.personal.sName}`,
            militaryRank: user.job.militaryRank,
            position: user.job.position,
        });
    };

    const handleCountChange = (value: string) => {
        const count = Math.max(0, Number(value) || 0);
        setApproverCount(count);
        setAdditionalApprovers(
            Array(count)
                .fill(null)
                .map(() => ({
                    userId: "",
                    fullName: "",
                    militaryRank: "",
                    position: "",
                }))
        );
    };

    const handleSelectAdditional = (index: number, userId: string) => {
        const user = users.find((u: UserFromApi) => u.userId === userId);
        if (!user) return;

        const updated = [...additionalApprovers];
        updated[index] = {
            userId: user.userId,
            fullName: `${user.personal.fName} ${user.personal.name} ${user.personal.sName}`,
            militaryRank: user.job.militaryRank,
            position: user.job.position,
        };
        setAdditionalApprovers(updated);
    };

    const handleSubmit = () => {
        const validAdditional = additionalApprovers.filter((a) => a.userId);
        const allApprovers = mainApprover ? [mainApprover, ...validAdditional] : validAdditional;
        onSave(mainApprover, allApprovers);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Imzo Qo‘shish</DialogTitle>
                    <DialogDescription>
                        Asosiy va qo‘shimcha tasdiqlovchilarni tanlang, so‘ng saqlash tugmasini bosing.
                    </DialogDescription>
                </DialogHeader>

                {!users.length ? (
                    <p>Foydalanuvchilar topilmadi.</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Asosiy tasdiqlovchi */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Asosiy tasdiqlovchi</label>

                            <Select
                                onValueChange={handleSelectMain}
                                value={mainApprover?.userId || ""}
                            >
                                <SelectTrigger className={'w-full'}>
                                    <SelectValue placeholder="Tanlang"/>
                                </SelectTrigger>

                                <SelectContent className={'w-full'}>
                                    {users.map((user: UserFromApi) => (
                                        <SelectItem key={user.userId} value={user.userId}>
                                            {user.job.militaryRank} {user.personal.fName} {user.personal.name}{" "}
                                            {user.personal.sName} ({user.job.position})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Qo‘shimcha tasdiqlovchilar soni */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Qo‘shimcha tasdiqlovchilar soni</label>
                            <Input
                                type="number"
                                min={0}
                                value={approverCount}
                                onChange={(e) => handleCountChange(e.target.value)}
                                placeholder="Masalan: 2"
                            />
                        </div>

                        {/* Dinamik Selectlar */}
                        {additionalApprovers.map((appr, index) => (
                            <div key={index} className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Tasdiqlovchi {index + 1}</label>

                                <Select
                                    onValueChange={(value) => handleSelectAdditional(index, value)}
                                    value={appr.userId || ""}
                                >
                                    <SelectTrigger className={'w-full'}>
                                        <SelectValue placeholder="Tanlang"/>
                                    </SelectTrigger>

                                    <SelectContent>
                                        {users.map((user: UserFromApi) => (
                                            <SelectItem key={user.userId} value={user.userId}>
                                                {user.job.militaryRank} {user.personal.fName} {user.personal.name}{" "}
                                                {user.personal.sName} ({user.job.position})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Bekor qilish
                    </Button>

                    <Button onClick={handleSubmit} disabled={!mainApprover}>
                        Saqlash
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
