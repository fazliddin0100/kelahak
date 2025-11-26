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
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-pulse h-8 w-8 text-indigo-500" />
      </div>
    );
  if (error)
    return (
      <div className="text-red-500 flex justify-center items-center h-[300px]">
        <NotData />
      </div>
    );

  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col p-6">
      {/* Search Input */}
      <div className="relative max-w-md mx-auto mb-4 w-full">
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md focus-within:ring-1 focus-within:ring-indigo-400">
          {/* Icon */}
          <Search className="ml-3 h-4 w-4 text-gray-400" />
          {/* Input */}
          <input
            type="text"
            placeholder="Nomi yoki Reg/raqam bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 rounded-lg"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="w-full h-full rounded-2xl border border-gray-200 shadow-sm bg-white">
          <Table className="w-full h-full">
            <TableHeader className="sticky top-0 bg-gray-50 z-10">
              <TableRow>
                <TableHead className="w-[60px] text-center border-r-2">
                  №
                </TableHead>
                <TableHead className="w-[60px] text-center border-r-2">
                  Icon
                </TableHead>
                <TableHead className="w-[420px] border-r-2">Nomi</TableHead>
                <TableHead className="border-r-2">Reg/Raqam</TableHead>
                <TableHead className="border-r-2">Sana</TableHead>
                <TableHead>Amal</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc, index) => (
                  <TableRow
                    key={doc._id || index}
                    className="hover:bg-gray-50 transition-all">
                    <TableCell className="text-center font-medium border-r-2 border-b-2">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-center border-r-2 border-b-2">
                      <FileText className="h-5 w-5 text-blue-500 mx-auto" />
                    </TableCell>
                    <TableCell className="font-medium border-r-2 border-b-2">
                      {doc.title}
                    </TableCell>
                    <TableCell className="border-r-2 border-b-2">
                      {doc.registrationIndex}
                    </TableCell>
                    <TableCell className="border-r-2 border-b-2">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-left p-1 border-b-2">
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
    </div>
  );
};

export default DocumentTable;
