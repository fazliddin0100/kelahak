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

interface BolinmaResponse {
  province: string;
  departments: string[];
}

export default function BolinmaModal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BolinmaResponse | null>(null);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await axios.get('/api/nameklatura/bolinma', {
            withCredentials: true,
          });
          setData(res.data);
        } catch {
          toast.error('Bo;linma mavjud emas!');
          // console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleSave = async () => {
    if (!selectedOrgan) {
      toast.error('Iltimos, organ tanlang');
      return;
    }

    try {
      await axios.post(
        '/api/nameklatura/reg-bolinma',
        { bolinma: selectedOrgan },
        {
          withCredentials: true,
        }
      );
      toast.success('Bolinma yaratildi');
      setOpen(false);
      setSelectedOrgan('');
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

              <Select onValueChange={setSelectedOrgan} value={selectedOrgan}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bolinma tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {data.departments.map((department, idx) => (
                    <SelectItem key={idx} value={department}>
                      {department}
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
