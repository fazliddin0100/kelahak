'use client';

import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetDocumentsKotibiyat } from '@/hooks/useGetDocumentKotibiyat';
import { Folder, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const RegDocuments = () => {
  const { documents, loading, error } = useGetDocumentsKotibiyat();
  const router = useRouter();

  console.log('Kotibiyat hujjatlari:', documents);

  if (loading) return <p>Yuklanmoqda...</p>;
  if (error) return <p>Xato: {error}</p>;

  console.log('Documents array:', documents);
  console.log('Documents length:', documents?.length);

  if (!documents || documents.length === 0) {
    console.log('Empty state should be shown now');
    return (
      <div className="w-full mt-10 border-2 border-red-300 bg-red-50 p-8 rounded-lg">
        <EmptyState />
        <p className="text-red-600 font-bold mt-4 text-center">
          ← Bu qizil ramka ichida EmptyState bo‘lishi kerak edi
        </p>
      </div>
    );
  }

  function getPreviewText(content?: string, wordCount: number = 6): string {
    if (!content) return '';
    let plainText = content.replace(/<[^>]+>/g, '');
    plainText = plainText
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const words = plainText.trim().split(/\s+/);
    return (
      words.slice(0, wordCount).join(' ') +
      (words.length > wordCount ? '…' : '')
    );
  }

  type DateLike = string | number | Date | { $date: string };

  function formatDate(dateLike?: DateLike) {
    if (!dateLike) return '-';

    const dateValue =
      typeof dateLike === 'object' && dateLike !== null && '$date' in dateLike ?
        dateLike.$date
      : dateLike;

    const d = new Date(dateValue as any);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('uz-UZ');
  }

  return (
    <Table className="w-full mt-10">
      <TableHeader>
        <TableRow>
          <TableHead>№</TableHead>
          <TableHead>Sarlavha</TableHead>
          <TableHead>Muallif</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Hudud</TableHead>
          <TableHead>Yaratilgan sana</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc, index) => (
          <TableRow key={doc._id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>
              {getPreviewText(
                typeof doc.content === 'string' ? doc.content : '',
                6
              )}
            </TableCell>
            <TableCell>{doc.author?.fullName}</TableCell>
            <TableCell>
              {doc.status === 'signed' ?
                <Badge className="bg-green-500 text-white">Imzolangan</Badge>
              : <Badge variant="outline">{doc.status}</Badge>}
            </TableCell>
            <TableCell>{doc.ownerRegion}</TableCell>
            <TableCell>{formatDate(doc.createdAt)}</TableCell>
            <TableCell className="text-center px-4 py-2">
              <Button
                variant="link"
                className="group relative text-blue-600 hover:underline"
                onClick={() =>
                  router.push(
                    `/document-open/open-document-regitrations/${doc._id}`
                  )
                }>
                <Folder className="inline-block mr-2 size-6 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1 absolute" />
                <FolderOpen className="inline-block mr-2 size-6 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
