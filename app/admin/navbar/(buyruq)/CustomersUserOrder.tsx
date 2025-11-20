'use client';

import { Check, CircleUserRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CustomerProps = {
  id: number;
  name: string;
  department?: string;
  expireDate?: string;
};

const CustomersUserOrder = ({
  id,
  name,
  department,
  expireDate,
}: CustomerProps) => {
  return (
    <div
      key={id}
      className="flex items-center justify-between border rounded-md p-3 shadow-sm hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        <CircleUserRoundIcon className="text-gray-600" />
        <div>
          <p className="font-medium">{name}</p>
          {department && <p className="text-sm text-gray-500">{department}</p>}
          {expireDate && <p className="text-xs text-gray-400">{expireDate}</p>}
        </div>
      </div>
      <Button variant="default" size="sm">
        <Check className="mr-2 size-4" />
        Ruxsat berish
      </Button>
    </div>
  );
};

export default CustomersUserOrder;
