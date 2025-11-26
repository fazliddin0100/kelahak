import { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Loader, Search } from 'lucide-react';
import NotData from '@/utils/not-data';
import AmallarButtons from './amallar';

const DocumentTable = ({ userId }: { userId?: string }) => {
  const [search, setSearch] = useState('');
  const { documents, loading, error } = useDocuments(userId);

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.copyNumber?.join(',').toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className={'flex justify-center items-center h-screen'}>
        <Loader className={'animate-pulse'} />
      </div>
    );
  if (error)
    return (
      <div className="text-red-500 flex justify-center items-center h-[300px]">
        <NotData />
      </div>
    );

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-2 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Nomi yoki Reg/raqam bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="max-h-[530px] overflow-y-auto border rounded-xl">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-100 z-10">
            <TableRow>
              <TableHead className="w-[60px] text-center">№</TableHead>
              <TableHead className="w-[60px] text-center">Icon</TableHead>
              <TableHead className="w-[420px]">Nomi</TableHead>
              <TableHead>Reg/Raqam</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Amal</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc, index) => (
                <TableRow
                  key={doc._id || index}
                  className="hover:bg-gray-50 transition">
                  <TableCell className="text-center font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-center">
                    <FileText className="h-5 w-5 text-blue-500 mx-auto" />
                  </TableCell>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell>{doc.registrationIndex}</TableCell>
                  <TableCell>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-left p-1">
                    {/* amallar */}
                    <AmallarButtons document={doc} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <NotData />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DocumentTable;
