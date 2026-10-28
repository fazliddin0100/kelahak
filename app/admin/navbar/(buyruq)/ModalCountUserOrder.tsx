'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import CustomersUserOrder from './CustomersUserOrder';
import { UsersRound } from 'lucide-react';

type Customer = {
  id: number;
  name: string;
  department?: string;
  expireDate?: string;
};

const ModalCountUserOrder = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Demo uchun fake data
  const customers: Customer[] = [
    {
      id: 1,
      name: 'Fayzullayev D.M.',
      department: 'Kotibiyat',
      expireDate: '12.15.2024 yilga qadar',
    },
    {
      id: 2,
      name: 'Karimov A.A.',
      department: 'Buxgalteriya',
      expireDate: '01.10.2025 yilga qadar',
    },
    {
      id: 3,
      name: 'Toshpulatov B.B.',
      department: 'Kadrlar bo‘limi',
      expireDate: '05.20.2025 yilga qadar',
    },
  ];

  return (
    <div className="flex items-center">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative h-8 gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
            <UsersRound className="size-4" />
            So&#39;ralgan buyruqlar
            <Badge
              className="absolute -top-2 -right-2 size-5 justify-center rounded-full p-0 text-[10px]"
              variant="secondary">
              {customers.length}
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
              {customers.map((c) => (
                <CustomersUserOrder
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  department={c.department}
                  expireDate={c.expireDate}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModalCountUserOrder;
