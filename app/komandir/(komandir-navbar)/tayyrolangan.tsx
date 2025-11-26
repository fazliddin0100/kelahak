'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const data = [
  { id: 1, title: 'Shartnoma 2024', author: 'Ali', date: '2024-03-10' },
  { id: 2, title: 'Hisobot 1-chorak', author: 'Vali', date: '2024-04-05' },
  { id: 3, title: 'Tender hujjati', author: 'Gulbahor', date: '2024-02-12' },
  { id: 4, title: 'Litsenziya nusxasi', author: 'Aziza', date: '2024-05-01' },
];

export default function Tayyyorlangan() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col">
      {/* Search Input */}
      <div className="relative max-w-xl mx-auto mb-8 w-full mt-6">
        {/* Container */}
        <div className="flex items-center bg-white rounded-2xl shadow-md border border-gray-200 transition-all duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-500">
          {/* Icon */}
          <Search className="ml-4 h-6 w-6 text-gray-400" />
          {/* Input */}
          <Input
            type="text"
            placeholder="Hujjat nomi bo‘yicha izlash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-4 py-4 text-gray-700 placeholder:text-gray-400 rounded-2xl"
          />
        </div>
      </div>

      {/* Table full screen */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="w-full h-full rounded-2xl border border-gray-200 shadow-sm bg-white">
          <Table className="w-full h-full p-2">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700 w-16 border-r-2">
                  #
                </TableHead>
                <TableHead className="font-semibold text-gray-700 border-r-2">
                  Hujjat nomi
                </TableHead>
                <TableHead className="font-semibold text-gray-700 border-r-2">
                  Muallif
                </TableHead>
                <TableHead className="font-semibold text-gray-700 border-r-2">
                  Sana
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50 transition-all">
                    <TableCell className="text-center border-r-2 border-b-2">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 border-r-2 border-b-2">
                      {item.title}
                    </TableCell>
                    <TableCell className="text-gray-700 border-r-2 border-b-2">
                      {item.author}
                    </TableCell>
                    <TableCell className="text-gray-700 border-r-2 border-b-2">
                      {item.date}
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-gray-400 py-6">
                    Hech narsa topilmadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
