'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LoadingState from '@/components/LoadingState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentFormUsers } from '@/hooks/useDocumentFormUsers';
import { IUserPopulated } from '@/types/user';
import { useState } from 'react';

// Props tipi – to'g'ri IUserPopulated ishlatilmoqda
interface XatYuboruvchiModalProps {
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

export default function XatYuboruvchiModal({
  open,
  onClose,
  onSave,
}: XatYuboruvchiModalProps) {
  const [sender, setSender] = useState<IUserPopulated | null>(null);
  const [receivers, setReceivers] = useState<IUserPopulated[]>([]);
  const { users: senderUsers, loading: senderLoading } =
    useDocumentFormUsers(open, 'organ');
  const { users: receiverUsers, loading: receiverLoading } =
    useDocumentFormUsers(open, 'letter-recipients');
  const loading = senderLoading || receiverLoading;

  const handleSenderChange = (userId: string) => {
    const user = senderUsers.find((u) => u.userId === userId);
    setSender(user ?? null);
    setReceivers((prev) => prev.filter((receiver) => receiver.userId !== userId));
  };

  const handleReceiverChange = (userId: string) => {
    const user = receiverUsers.find((u) => u.userId === userId);
    if (!user) return;

    // Agar allaqachon tanlangan bo‘lsa, olib tashlash
    setReceivers((prev) =>
      prev.some((r) => r.userId === userId) ?
        prev.filter((r) => r.userId !== userId)
      : [...prev, user]
    );
  };

  const handleSubmit = () => {
    onSave({ sender, receivers });
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    } else {
      setSender(null);
      setReceivers([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Xat Yuboruvchi</DialogTitle>
          <DialogDescription>
            Yuboruvchi va qabul qiluvchilarni tanlang.
          </DialogDescription>
        </DialogHeader>

        {loading ?
          <LoadingState message="Foydalanuvchilar yuklanmoqda..." className="py-2" />
        : !senderUsers.length && !receiverUsers.length ?
          <p>
            Joriy viloyatdagi xodimlar yoki boshqa viloyatlardagi komandirlar
            topilmadi. Foydalanuvchilar tizimga kirish uchun tasdiqlangan
            bo‘lishi kerak.
          </p>
        : <div className="flex flex-col gap-4">
            {/* Yuboruvchi */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Yuboruvchi</label>
              <Select
                onValueChange={handleSenderChange}
                value={sender?.userId || ''}>
                <SelectTrigger className={'w-full'}>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {senderUsers.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.job.militaryRank} {user.personal.fName}{' '}
                      {user.personal.name} {user.personal.sName} (
                      {user.job.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Qabul qiluvchilar */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Qabul qiluvchilar</label>
              <Select onValueChange={handleReceiverChange}>
                <SelectTrigger className={'w-full'}>
                  <SelectValue placeholder="Qabul qiluvchi qo‘shish" />
                </SelectTrigger>
                <SelectContent>
                  {receiverUsers
                    .filter((u) => u.userId !== sender?.userId)
                    .map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        {user.job.militaryRank} {user.personal.fName}{' '}
                        {user.personal.name} {user.personal.sName} (
                        {user.job.position}) — {user.personal.province}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Tanlanganlar ro‘yxati */}
              {receivers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {receivers.map((r) => (
                    <span
                      key={r.userId}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm">
                      {r.personal.fName} {r.personal.name}
                      <button
                        onClick={() => handleReceiverChange(r.userId)}
                        className="ml-1 text-red-600 hover:text-red-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        }

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!sender || receivers.length === 0}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
