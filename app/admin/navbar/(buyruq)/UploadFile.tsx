'use client';

import { useState } from 'react';
import { AiOutlineFieldNumber } from 'react-icons/ai';
import { VscGistSecret } from 'react-icons/vsc';
import { CiCalendarDate } from 'react-icons/ci';
import { BiRename } from 'react-icons/bi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const FileModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form values
  const [nomi, setNomi] = useState('');
  const [raqami, setRaqami] = useState('');
  const [maxfiylik, setMaxfiylik] = useState('');
  const [sanasi, setSanasi] = useState('');

  // Form validatsiya: hamma maydon to‘ldirilganmi?
  const isFormValid = nomi && raqami && maxfiylik && sanasi;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Faqat PDF faylga ruxsat beramiz
    if (file.type !== 'application/pdf') {
      toast('❌ Faqat PDF fayl yuklash mumkin!');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Fayl nomini raqam+sana qilib beramiz
      const customName = `${raqami}_${sanasi}_${file.name}`;
      formData.append('customName', customName);
      formData.append('nomi', nomi);
      formData.append('raqami', raqami);
      formData.append('maxfiylik', maxfiylik);
      formData.append('sanasi', sanasi);

      const res = await fetch('/api/file/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast(`✅ Yuklandi: ${data.fileName} muvaffaqiyatli saqlandi`);
        setIsOpen(false);
      } else {
        toast(`❌ Xatolik: ${data.error || 'Yuklashda muammo'}`);
      }
    } catch {
      toast('❌ Xatolik: Yuklashda muammo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload size={16} />
          Fayl
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Yangi fayl</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Form inputs */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <BiRename size={20} className="text-gray-500" />
              <Input
                placeholder="Nomi"
                value={nomi}
                onChange={(e) => setNomi(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <AiOutlineFieldNumber size={20} className="text-gray-500" />
              <Input
                placeholder="Raqami"
                value={raqami}
                onChange={(e) => setRaqami(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <VscGistSecret size={20} className="text-gray-500" />
              <Input
                placeholder="Maxfiylik darajasi"
                value={maxfiylik}
                onChange={(e) => setMaxfiylik(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <CiCalendarDate size={20} className="text-gray-500" />
              <Input
                placeholder="Sanasi"
                value={sanasi}
                onChange={(e) => setSanasi(e.target.value)}
                className="w-48"
              />
            </div>
          </div>

          {/* Upload button */}
          <div>
            <input
              type="file"
              id="upload-file-input"
              onChange={handleUpload}
              disabled={loading}
              className="hidden"
            />
            <label
              htmlFor="upload-file-input"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border ${
                isFormValid
                  ? 'cursor-pointer bg-white hover:bg-gray-100'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}>
              <Upload size={16} />
              {loading ? 'Yuklanmoqda...' : 'Fayl yuklash'}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileModal;
