'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { AiOutlineFieldNumber } from 'react-icons/ai';
import { BiRename } from 'react-icons/bi';
import { CiCalendarDate } from 'react-icons/ci';
import { VscGistSecret } from 'react-icons/vsc';

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
        <Button
          variant="outline"
          className="gap-2 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
          <Upload className="size-4" />
          Fayl yuklash
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-2xl border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Yangi buyruq fayli</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <BiRename size={18} className="shrink-0 text-slate-400" />
              <Input
                placeholder="Nomi"
                value={nomi}
                onChange={(e) => setNomi(e.target.value)}
                className="border-slate-200 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <AiOutlineFieldNumber size={18} className="shrink-0 text-slate-400" />
              <Input
                placeholder="Raqami"
                value={raqami}
                onChange={(e) => setRaqami(e.target.value)}
                className="border-slate-200 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <VscGistSecret size={18} className="shrink-0 text-slate-400" />
              <Input
                placeholder="Maxfiylik darajasi"
                value={maxfiylik}
                onChange={(e) => setMaxfiylik(e.target.value)}
                className="border-slate-200 focus-visible:ring-sky-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <CiCalendarDate size={18} className="shrink-0 text-slate-400" />
              <Input
                placeholder="Sanasi"
                value={sanasi}
                onChange={(e) => setSanasi(e.target.value)}
                className="border-slate-200 focus-visible:ring-sky-500/30"
              />
            </div>
          </div>

          <div>
            <input
              type="file"
              id="upload-file-input"
              accept="application/pdf"
              onChange={handleUpload}
              disabled={loading || !isFormValid}
              className="hidden"
            />
            <label
              htmlFor="upload-file-input"
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                isFormValid && !loading ?
                  'cursor-pointer border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              }`}>
              <Upload className="size-4" />
              {loading ? 'Yuklanmoqda...' : 'PDF fayl yuklash'}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileModal;
