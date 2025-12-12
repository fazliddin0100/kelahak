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
import QrCodeJurnal from '@/helpers/qr-code-jurnal';

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
    <div className="w-full overflow-x-auto">
      <Table className="min-w-max w-full border-collapse">
        <TableHeader className="sticky top-0 z-10 bg-linear-to-r from-blue-50 to-indigo-100">
          <TableRow className="text-sm font-semibold text-gray-700">
            <TableHead className="text-center px-4 py-3 border-r">
              Qayd raqami <br /> va maxfiylik belgisi
            </TableHead>
            <TableHead className="text-center px-4 py-3 border-r">
              Imzo qo‘yilgan <br /> sana
            </TableHead>
            <TableHead className="text-center px-4 py-3 border-r">
              Tayyorlagan shaxs
            </TableHead>
            <TableHead className="px-4 py-3 border-r">
              Hujjatning turi va qisqacha mazmuni
            </TableHead>
            <TableHead className="text-center px-4 py-3 border-r">
              Nusxalar soni <br /> va manzillari
            </TableHead>
            <TableHead className="text-center px-4 py-3 border-r">
              Hujjatni qabul <br /> qilgan shaxs
            </TableHead>
            <TableHead className="text-center px-4 py-3 border-r">
              Olganligi haqida <br /> imzo
            </TableHead>
            <TableHead className="text-center px-4 py-3 border-r">
              Ishjildning turi va <br /> raqami
            </TableHead>
            <TableHead className="text-center px-4 py-3">Ko‘rish</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc._id}
              className="hover:bg-blue-50 transition-colors duration-200 text-gray-600">
              <TableCell className="text-center px-4 py-2">
                {doc.registrationIndex || '-'} <br /> {doc.grif}
              </TableCell>
              <TableCell className="text-center px-4 py-2">
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
              <TableCell className="px-4 py-2">
                {doc.author?.fullName}
              </TableCell>
              <TableCell className="px-4 py-2">
                {getPreviewText(
                  typeof doc.content === 'string' ? doc.content : '',
                  6
                )}
              </TableCell>
              <TableCell className="px-4 py-2">
                {doc.copyNumber?.length ? doc.copyNumber : '-'}
              </TableCell>
              <TableCell className="text-center px-4 py-2">
                {doc.forwardedBy?.fullName || 'Qabul qilinmagan'}
              </TableCell>
              <TableCell className="text-center px-4 py-2">
                {doc.forwardedBy?.fullName ? (
                  <QrCodeJurnal fullNames={doc.forwardedBy.fullName} />
                ) : (
                  'Qabul qilinmagan'
                )}
              </TableCell>
              <TableCell className="text-center px-4 py-2">
                {doc.nomenclatureId?.registrationIndex}
              </TableCell>
              <TableCell className="text-center px-4 py-2">
                <Button
                  variant="link"
                  className="group relative text-blue-600 hover:underline">
                  <Folder className="inline-block mr-2 size-6 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1 absolute" />
                  <FolderOpen className="inline-block mr-2 size-6 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Forma3;
