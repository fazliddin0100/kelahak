'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useKotibiyatUsers } from '@/hooks/useKotibiyatUsers';

interface ShareUserModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
}

export default function ShareUserModal({
  open,
  onClose,
  documentId,
}: ShareUserModalProps) {
  const { users, loading } = useKotibiyatUsers();
  const [selectedUser, setSelectedUser] = useState('');

  const handleShare = async () => {
    if (!selectedUser) {
      toast.error('Foydalanuvchini tanlang');
      return;
    }
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: selectedUser }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message);
        return;
      }
      toast.success('Hujjat yuborildi!');
      onClose();
    } catch {
      toast.error('Server xatosi');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end mt-[50px]">
      <div className="bg-white p-4 rounded-xl w-[400px]">
        <h2 className="text-lg font-semibold mb-4">Kimga yuboriladi?</h2>
        <label htmlFor="userSelect" className="block mb-2 text-sm font-medium">
          Foydalanuvchini tanlang
        </label>
        <select
          id="userSelect"
          className="w-full border p-2 rounded-lg"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          disabled={loading}>
          <option value="">Tanlang...</option>
          {!loading &&
            users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.personal?.name} {u.personal?.fName} {u.personal?.sName}
              </option>
            ))}
        </select>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={handleShare} disabled={loading}>
            Yuborish
          </Button>
        </div>
      </div>
    </div>
  );
}
