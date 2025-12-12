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
import { useGetSharedDocuments } from '@/hooks/useShareKotibiyatDocumen';

const Forma3 = () => {
  const { documents } = useGetSharedDocuments();

  function getPreviewText(content?: string, wordCount: number = 6): string {
    if (!content) return '';
    // HTML teglarini olib tashlash
    let plainText = content.replace(/<[^>]+>/g, '');
    // HTML entitylarni decode qilish
    plainText = plainText
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    // So‘zlarni ajratish
    const words = plainText.trim().split(/\s+/);
    return (
      words.slice(0, wordCount).join(' ') +
      (words.length > wordCount ? '…' : '')
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Reg/Raqam</TableHead>
            <TableHead className="text-center">Sana</TableHead>
            <TableHead className="text-center">Muallif</TableHead>
            <TableHead>Hujjatning qisqacha mazmuni</TableHead>
            <TableHead className="text-center">
              Hujjat yuborlgan manzil
            </TableHead>
            <TableHead className="text-center">
              Hujjatni qabul qilib olgan shaxs
            </TableHead>
            <TableHead className="text-center">
              Qabul qilganligi xususida imzo
            </TableHead>
            <TableHead className="text-center">Ishjild raqami</TableHead>
            <TableHead className="text-center">Ko‘rish</TableHead>
          </TableRow>
        </TableHeader>
        {documents.map((doc) => (
          <TableBody key={doc._id} className="text-muted-foreground">
            <TableRow>
              <TableCell className="text-center">
                {doc.registrationIndex ? doc.registrationIndex : '-'}
              </TableCell>
              <TableCell className="text-center">
                {doc.createdAt
                  ? new Date(
                      typeof doc.createdAt === 'string'
                        ? doc.createdAt
                        : doc.createdAt instanceof Date
                        ? doc.createdAt
                        : doc.createdAt.$date
                    ).toLocaleDateString()
                  : ''}
              </TableCell>
              <TableCell>{doc.author?.fullName}</TableCell>
              <TableCell>
                <span>
                  {getPreviewText(
                    typeof doc.content === 'string' ? doc.content : '',
                    6
                  )}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {doc.copyNumber?.length ? doc.copyNumber : '-'}
              </TableCell>
              <TableCell className="text-center">Akmal</TableCell>
              <TableCell className="text-center">Imzo</TableCell>
              <TableCell className="text-center">NX-2025</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="link"
                  className="group relative text-blue-600 hover:underline">
                  <Folder className="inline-block mr-2 size-7 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1 absolute" />
                  <FolderOpen className="inline-block mr-2 size-7 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        ))}
      </Table>
    </div>
  );
};

export default Forma3;
