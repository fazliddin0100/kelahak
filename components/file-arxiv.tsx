'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FaFilePdf } from 'react-icons/fa6';
import { mockDocuments } from '@/data/mockDocuments';
import type { DocumentType } from '@/types/document';

interface Props {
  documentId?: string | null;
}

const FileArxiv: React.FC<Props> = ({ documentId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const files = useMemo<DocumentType[]>(() => {
    return documentId
      ? mockDocuments.filter((doc) => doc._id === documentId)
      : mockDocuments;
  }, [documentId]);

  const filteredFiles = files.filter((file) =>
    file.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full">
      <Input
        placeholder="Hujjat nomidan qidirish..."
        className="mb-3"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <Card className="divide-y">
        {filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Hujjat topilmadi...
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={String(file._id)}
              className="grid grid-cols-12 items-center p-3 hover:bg-gray-50 transition">
              <div className="col-span-1 text-center">
                {file.registrationIndex}
              </div>

              <div className="col-span-1 text-center">
                <FaFilePdf size={22} className="text-red-600 mx-auto" />
              </div>

              <div className="col-span-6">{file.title}</div>

              <div className="col-span-2 text-center">
                {file.author?.fullName}
              </div>

              <div className="col-span-2 flex justify-center">
                <Button variant="outline">Ochish</Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};

export default FileArxiv;
