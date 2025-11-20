'use client';

import { useEffect, useState } from 'react';
import { FaFolder } from 'react-icons/fa';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ModalFile from './(buyruq)/UploadFile';
import ModalCountOrder from './(buyruq)/ModalCountUser';
import ModalCountUserOrder from './(buyruq)/ModalCountUserOrder';

type FileItem = {
  _id: string;
  nomi: string;
  raqami: string;
  maxfiylik: string;
  sanasi: string;
  filePath: string;
};

const Buyruq = () => {
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/file/upload-get');
        const data = await res.json();
        setFiles(data);
      } catch (err) {
        console.error('Fayllarni olishda xato:', err);
      }
    };

    fetchFiles();
  }, []);

  return (
    <div className="w-full mt-4 space-y-4">
      {/* File upload + modal */}
      <div className="flex justify-center items-center gap-4">
        <ModalFile />
      </div>

      {/* Files list */}
      {files.map((file, index) => (
        <Card key={file._id} className="shadow-md border rounded-lg">
          <CardContent className="grid grid-cols-12 gap-4 items-center py-1">
            {/* Index */}
            <div className="col-span-1 text-center font-semibold">
              {index + 1}
            </div>

            {/* Icon */}
            <div className="col-span-1 flex justify-center">
              <FaFolder size={22} className="text-blue-600" />
            </div>

            {/* Description */}
            <div className="col-span-3 text-sm text-gray-700">{file.nomi}</div>

            {/* Count */}
            <div className="col-span-1 text-center text-gray-600">
              {file.maxfiylik}
            </div>

            {/* Code */}
            <div className="col-span-1 text-center text-gray-600">
              {file.raqami}
            </div>

            {/* Date */}
            <div className="col-span-1 text-center text-gray-600">
              {file.sanasi}
            </div>

            {/* Orders modal */}
            <div className="col-span-2 flex justify-center">
              <ModalCountOrder />
            </div>

            {/* Users modal */}
            <div className="col-span-1 flex justify-center">
              <ModalCountUserOrder />
            </div>

            {/* Ochish tugmasi */}
            <div className="col-span-1 flex justify-center">
              <a
                href={`/api/file/${file._id}`}
                target="_blank"
                rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  Ochish
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Buyruq;
