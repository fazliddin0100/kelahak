'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { Building2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ModalBody,
  ModalField,
  ModalFooterBar,
  ModalHeaderBlock,
  ModalLoading,
  modalContentFormClass,
  modalFieldClass,
  modalTriggerSecondary,
} from './modal-shared';

interface BolimResponse {
  province: string;
  organs: string[];
}

export default function BolimModal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BolimResponse | null>(null);
  const [selectedBolim, setSelectedBolim] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleSave = async () => {
    if (!selectedBolim) {
      toast.error('Iltimos, bo‘limni tanlang');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        '/api/nameklatura/reg-bolim',
        { bolim: selectedBolim },
        { withCredentials: true }
      );
      toast.success('Bo‘lim qo‘shildi');
      setOpen(false);
      setSelectedBolim('');
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) ?
          err.response?.data?.message
        : 'Xatolik yuz berdi';
      toast.error(errorMessage || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className={modalTriggerSecondary}
        onClick={() => setOpen(true)}>
        <Building2 className="size-4" />
        Bo‘lim
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={modalContentFormClass} showCloseButton>
          <ModalHeaderBlock
            icon={Building2}
            title="Bo‘lim qo‘shish"
            description="Tashkilot bo‘limini nomenklaturaga bog‘lash"
            iconClassName="bg-violet-500/10 text-violet-600"
          />

          <ModalBody>
            {loading ?
              <ModalLoading />
            : data ?
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
                  <span className="text-slate-500">Viloyat: </span>
                  <span className="font-semibold text-slate-800">
                    {data.province}
                  </span>
                </div>

                <ModalField label="Organ / bo‘lim">
                  <Select onValueChange={setSelectedBolim} value={selectedBolim}>
                    <SelectTrigger className={modalFieldClass}>
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
                </ModalField>
              </>
            : <p className="text-center text-sm text-slate-500">
                Ma’lumot topilmadi
              </p>
            }
          </ModalBody>

          <ModalFooterBar>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setOpen(false)}>
              Yopish
            </Button>
            <Button
              className="gap-2 bg-violet-600 hover:bg-violet-700"
              onClick={handleSave}
              disabled={saving || !selectedBolim}>
              <Save className="size-4" />
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </ModalFooterBar>
        </DialogContent>
      </Dialog>
    </>
  );
}
