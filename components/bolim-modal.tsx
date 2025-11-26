'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

interface BolimResponse {
  province: string;
  organs: string[];
}

export default function BolimModal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BolimResponse | null>(null);
  const [selectedBolim, setSelectedBolim] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await axios.get('/api/nameklatura/bolim', {
            withCredentials: true,
          });
          setData(res.data);
        } catch {
          toast.error("Bo'limlar mavjud emas!");
          // console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleSave = async () => {
    if (!selectedBolim) {
      toast.error('Iltimos, bo`limni tanlang');
      return;
    }

    try {
      await axios.post(
        '/api/nameklatura/reg-bolim',
        { bolim: selectedBolim },
        {
          withCredentials: true,
        }
      );
      toast.success('Bolinma yaratildi');
      setOpen(false);
      setSelectedBolim('');
    } catch (err) {
      toast.error('Saqlashda xatolik yuz berdi');
      console.error(err);
    }
  };

  return (
    <div className="ml-2">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Bolinma
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bolinma tanlash</DialogTitle>
          </DialogHeader>

          {loading && <p className="text-sm text-gray-500">Yuklanmoqda...</p>}

          {!loading && data && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Viloyat: <span className="font-semibold">{data.province}</span>
              </p>

              <Select onValueChange={setSelectedBolim} value={selectedBolim}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Organ tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {data.organs.map((organ, idx) => (
                    <SelectItem key={idx} value={organ}>
                      {organ}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSave}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
