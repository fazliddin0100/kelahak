'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ModalArxiv from '@/components/modal-arxiv';
import CreateNomeklatura from '@/components/CreateNomeklatura';
import Bolinma from '@/components/bolim-modal';
import NotData from '@/utils/not-data';
import { PiBooksFill } from 'react-icons/pi';
import BolinmaModal from '@/components/bolinma-modal';
import { useNomeklatura } from '@/hooks/useNomeklatura';

const Nomeklatura: React.FC = () => {
  const { nomeklatura, loading } = useNomeklatura();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleArchive = (id: string) => {
    console.log(`Archiving item with ID: ${id}`);
    toast.success('Ish jild arxivga olindi');
  };

  const handleOpen = (id: string) => {
    setSelectedId(id);
    setIsModalOpen(true);
    toast.success('Ochildi');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedId(null);
  };

  return (
    <div className="w-full mt-6 px-6">
      {/* create nomeklatura model */}
      <div className="flex justify-end gap-2 mb-6">
        <Bolinma />
        <BolinmaModal />
        <CreateNomeklatura />
      </div>

      {/* Table container */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="bg-linear-to-r from-blue-500 to-indigo-600 text-white">
              <TableHead className="text-center w-[3%]">T/R</TableHead>
              <TableHead className="w-[15%]">Ish jild Nomi</TableHead>
              <TableHead className="text-center w-[5%]">Maxfiylik</TableHead>
              <TableHead className="text-center w-[10%]">Sana</TableHead>
              <TableHead className="text-center w-[15%]">
                Javobgar shaxs
              </TableHead>
              <TableHead className="text-center w-[8%]">Imzo</TableHead>
              <TableHead className="text-center w-[10%]">
                Saqlash muddati
              </TableHead>
              <TableHead className="text-center w-[8%]">Arxiv olish</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nomeklatura.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex justify-center items-center h-64">
                    <NotData />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              nomeklatura.map((bolinmaItem) => (
                <React.Fragment
                  key={String(
                    (bolinmaItem._id as any)?.$oid ?? bolinmaItem._id
                  )}>
                  {/* Bo‘linma nomi uchun alohida row */}
                  <TableRow className="bg-gray-100">
                    <TableCell
                      colSpan={9}
                      className="font-bold text-lg text-blue-700 text-center">
                      {bolinmaItem.bolinma.toUpperCase()}
                    </TableCell>
                  </TableRow>

                  {/* Har bir bo‘linmaga tegishli nomeklaturalar */}
                  {bolinmaItem.nomeklaturalar.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-gray-500">
                        <div className="flex justify-center items-center h-64">
                          <NotData />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bolinmaItem.nomeklaturalar.map((item) => (
                      <TableRow
                        key={String((item._id as any)?.$oid ?? item._id)}
                        className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell className="text-center font-medium text-gray-700 border border-r-2">
                          {item.registrationIndex}
                        </TableCell>
                        <TableCell className="text-gray-800 border border-r-2">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-center text-gray-600 border border-r-2">
                          {item.grif}
                        </TableCell>
                        <TableCell className="text-center text-gray-600 border border-r-2">
                          {dayjs(
                            (item.createdAt as any)?.$date ?? item.createdAt
                          ).format('DD/MM/YYYY')}
                        </TableCell>
                        <TableCell className="text-center text-gray-700 font-semibold border border-r-2">
                          {/* Agar author kelgan bo‘lsa */}
                          {item.author?.fullName || '—'}
                        </TableCell>
                        <TableCell className="text-center border border-r-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.hasSigned
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-600'
                            }`}>
                            {item.hasSigned ? 'Imzolangan' : 'Imzolanmagan'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-gray-600 border border-r-2">
                          {item.saqlashMuddati || '—'} yil <br />{' '}
                          {item.qonunTuri || ''}
                        </TableCell>
                        <TableCell className="text-center border border-r-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-blue-50"
                            onClick={() =>
                              handleArchive(
                                typeof item._id === 'object' &&
                                  '$oid' in item._id
                                  ? item._id.$oid
                                  : item._id
                              )
                            }>
                            <PiBooksFill className="h-5 w-5 text-blue-600" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-indigo-50"
                            onClick={() =>
                              handleOpen(
                                typeof item._id === 'object' &&
                                  '$oid' in item._id
                                  ? item._id.$oid
                                  : item._id
                              )
                            }>
                            📂
                          </Button>
                          <ModalArxiv
                            open={isModalOpen}
                            onClose={handleCloseModal}
                            id={selectedId}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Nomeklatura;
