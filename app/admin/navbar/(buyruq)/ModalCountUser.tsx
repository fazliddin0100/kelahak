'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import LoadingState from '@/components/LoadingState';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import CustomersUser from './CustomersOrder';
import { UsersRound } from 'lucide-react';

type User = {
  id: number;
  name: string;
  department?: string;
  expireDate?: string;
};

const ModalCountUser = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/buyruq-olganlar');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Xatolik:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex items-center">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative h-8 gap-1 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100">
            <UsersRound className="size-4" />
            Foydalanayotganlar
            <Badge
              className="absolute -top-2 -right-2 size-5 justify-center rounded-full p-0 text-[10px]"
              variant="secondary">
              {users.length}
            </Badge>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl h-[400px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Buyruqdan nusha olgan shaxslar ro&#39;yxati
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md p-2 h-[300px] overflow-y-auto space-y-2">
              {loading ? (
                <LoadingState message="Foydalanuvchilar yuklanmoqda..." className="py-4" />
              ) : users.length > 0 ? (
                users.map((user) => <CustomersUser key={user.id} {...user} />)
              ) : (
                <p className="text-center text-gray-500">
                  Hech qanday foydalanuvchi topilmadi
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModalCountUser;
