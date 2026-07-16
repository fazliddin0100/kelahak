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
import { GitBranch, Save } from 'lucide-react';
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
  modalTriggerAccent,
} from './modal-shared';

interface BolinmaResponse {
  province: string;
  departments: string[];
}

export default function BolinmaModal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BolinmaResponse | null>(null);
  const [selectedOrgan, setSelectedOrgan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
          toast.error("Bo'linma mavjud emas!");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleSave = async () => {
    if (!selectedOrgan) {
      toast.error('Iltimos, bo‘linmani tanlang');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        '/api/nameklatura/reg-bolinma',
        { bolinma: selectedOrgan },
        { withCredentials: true }
      );
      toast.success('Bo‘linma qo‘shildi');
      setOpen(false);
      setSelectedOrgan('');
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message ?
          err.response.data.message
        : 'Xatolik yuz berdi';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className={modalTriggerAccent}
        onClick={() => setOpen(true)}>
        <GitBranch className="size-4" />
        Bo‘linma
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={modalContentFormClass} showCloseButton>
          <ModalHeaderBlock
            icon={GitBranch}
            title="Bo‘linma qo‘shish"
            description="Tashkilot ichidagi bo‘linmani tanlash"
            iconClassName="bg-sky-500/10 text-sky-600"
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

                <ModalField label="Bo‘linma">
                  <Select onValueChange={setSelectedOrgan} value={selectedOrgan}>
                    <SelectTrigger className={modalFieldClass}>
                      <SelectValue placeholder="Bo‘linma tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.departments.map((department, idx) => (
                        <SelectItem key={idx} value={department}>
                          {department}
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
              className="gap-2 bg-sky-600 hover:bg-sky-700"
              onClick={handleSave}
              disabled={saving || !selectedOrgan}>
              <Save className="size-4" />
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </ModalFooterBar>
        </DialogContent>
      </Dialog>
    </>
  );
}
