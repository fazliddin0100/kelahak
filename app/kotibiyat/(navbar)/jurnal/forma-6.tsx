// app/components/Forma3.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Folder, FolderOpen } from 'lucide-react';

const Forma6 = () => {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Raqami</TableHead>
            <TableHead>Ro`yxatga olingan raqami</TableHead>
            <TableHead>Sana</TableHead>
            <TableHead>Qisqacha mazmuni</TableHead>
            <TableHead>Tayyorlagan shaxs</TableHead>
            <TableHead>Nusxalar soni</TableHead>
            <TableHead>Nusxa raqami</TableHead>
            <TableHead>Qabul qilgan shaxs yoki yuborilgan manzil</TableHead>
            <TableHead>Qabul qilganligi xususida imzo</TableHead>
            <TableHead>Ko‘rish</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>001</TableCell>
            <TableCell>10.12.2025</TableCell>
            <TableCell>Dilshod</TableCell>
            <TableCell>Shartnoma</TableCell>
            <TableCell>Toshkent</TableCell>
            <TableCell>11.12.2025</TableCell>
            <TableCell>Akmal</TableCell>
            <TableCell>imzo</TableCell>
            <TableCell>NX-2025</TableCell>
            <TableCell>
              <Button
                variant="link"
                className="group relative text-blue-600 hover:underline">
                <Folder className="inline-block mr-2 size-7 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1 absolute" />
                <FolderOpen className="inline-block mr-2 size-7 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0" />
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>001</TableCell>
            <TableCell>10.12.2025</TableCell>
            <TableCell>Dilshod</TableCell>
            <TableCell>Shartnoma</TableCell>
            <TableCell>Toshkent</TableCell>
            <TableCell>11.12.2025</TableCell>
            <TableCell>Akmal</TableCell>
            <TableCell>Imzo</TableCell>
            <TableCell>NX-2025</TableCell>
            <TableCell>
              <Button
                variant="link"
                className="group relative text-blue-600 hover:underline">
                <Folder className="inline-block mr-2 size-7 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1 absolute" />
                <FolderOpen className="inline-block mr-2 size-7 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default Forma6;
