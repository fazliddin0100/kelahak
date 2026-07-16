'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBolimlar } from '@/hooks/useBolimData';
import { useDepartments } from '@/hooks/useDepartments';
import { useSessionsUsers } from '@/hooks/useSessionsUsers';
import axios from 'axios';
import { FolderPlus, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ?
      localStorage.getItem('ref_token') || localStorage.getItem('token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
import {
  ModalBody,
  ModalField,
  ModalFooterBar,
  ModalHeaderBlock,
  modalContentFormClass,
  modalFieldClass,
  modalTriggerPrimary,
} from './modal-shared';

interface CreateNomeklaturaProps {
  onSuccess?: () => void;
}

export default function CreateNomeklatura({ onSuccess }: CreateNomeklaturaProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { users, loading: loadingUsers } = useSessionsUsers();

  const [registrationIndex, setRegistrationIndex] = useState('');
  const [title, setTitle] = useState('');
  const [qonunTuri, setQonunTuri] = useState('');
  const [grif, setGrif] = useState('');
  const [saqlashMuddati, setSaqlashMuddati] = useState('');

  const [selectedOrgan, setSelectedOrgan] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: bolimlar = [], isError: errorBolimlar } = useBolimlar();

  const {
    data: bolinmalar = [] as Array<
      string | { _id: string; department?: string }
    >,
    isError: errorDepts,
  } = useDepartments();

  const handleSave = async () => {
    if (
      !registrationIndex ||
      !title ||
      !grif ||
      !saqlashMuddati ||
      !selectedOrgan ||
      !selectedDepartment ||
      !selectedUserId
    ) {
      toast.error('Iltimos, barcha maydonlarni to‘ldiring');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        registrationIndex,
        title,
        grif,
        qonunTuri: qonunTuri || '',
        saqlashMuddati:
          saqlashMuddati === 'doimiy' ? 'doimiy' : parseInt(saqlashMuddati, 10),
        bolinma: [selectedDepartment],
        bolim: [selectedOrgan],
        author: {
          userId: selectedUserId,
        },
      };

      const res = await axios.post('/api/nameklatura/reg-nomeklatura', payload, {
        withCredentials: true,
        headers: getAuthHeaders(),
      });

      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.data?.message || 'Yaratishda xatolik');
      }

      toast.success('Nomeklatura muvaffaqiyatli yaratildi');
      setOpen(false);
      setRegistrationIndex('');
      setTitle('');
      setGrif('');
      setQonunTuri('');
      setSaqlashMuddati('');
      setSelectedOrgan('');
      setSelectedDepartment('');
      setSelectedUserId('');
      onSuccess?.();
    } catch (err: unknown) {
      const data = axios.isAxiosError(err) ? err.response?.data : null;
      const message =
        (data && typeof data === 'object' && 'message' in data ?
          String(data.message)
        : null) ||
        (data && typeof data === 'object' && 'error' in data ?
          String(data.error)
        : null) ||
        (err instanceof Error ? err.message : null) ||
        'Yaratishda xatolik yuz berdi';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const hasError = errorBolimlar || errorDepts;

  return (
    <>
      <Button
        variant="outline"
        className={modalTriggerPrimary}
        onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nomeklatura yaratish
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={modalContentFormClass} showCloseButton>
          <ModalHeaderBlock
            icon={FolderPlus}
            title="Yangi ish jild yaratish"
            description="Nomenklatura ro‘yxatiga yangi yozuv qo‘shish"
            iconClassName="bg-indigo-500/10 text-indigo-600"
          />

          {hasError && (
            <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              Ma’lumot yuklashda xatolik
            </p>
          )}

          <ModalBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField label="Raqami">
                <Input
                  placeholder="01-2025"
                  value={registrationIndex}
                  onChange={(e) => setRegistrationIndex(e.target.value)}
                  className={modalFieldClass}
                />
              </ModalField>

              <ModalField label="Maxfiylik darajasi (grif)">
                <Input
                  placeholder="Ochiq / Maxfiy / Davlat siri"
                  value={grif}
                  onChange={(e) => setGrif(e.target.value)}
                  className={modalFieldClass}
                />
              </ModalField>
            </div>

            <ModalField label="Nomi">
              <Textarea
                placeholder="Ish jildining to‘liq nomi..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={3}
                className={modalFieldClass}
              />
            </ModalField>

            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField label="Buyruq bandi (ixtiyoriy)">
                <Input
                  placeholder="Masalan: 15-band"
                  value={qonunTuri}
                  onChange={(e) => setQonunTuri(e.target.value)}
                  className={modalFieldClass}
                />
              </ModalField>

              <ModalField label="Saqlash muddati">
                <Select value={saqlashMuddati} onValueChange={setSaqlashMuddati}>
                  <SelectTrigger className={modalFieldClass}>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 7, 10, 15, 25, 50, 75].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y} yil
                      </SelectItem>
                    ))}
                    <SelectItem value="doimiy">Doimiy</SelectItem>
                  </SelectContent>
                </Select>
              </ModalField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField label="Bo‘lim">
                <Select value={selectedOrgan} onValueChange={setSelectedOrgan}>
                  <SelectTrigger className={modalFieldClass}>
                    <SelectValue placeholder="Boshqarmani tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {bolimlar.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.province} — {item.bolim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ModalField>

              <ModalField label="Bo‘linma">
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}>
                  <SelectTrigger className={modalFieldClass}>
                    <SelectValue placeholder="Bo‘linmani tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {bolinmalar.map((item) => {
                      if (typeof item === 'string') {
                        return (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        );
                      }

                      return (
                        <SelectItem key={item._id} value={item._id}>
                          {((item as { province?: string }).province ?
                            `${(item as { province?: string }).province} — `
                          : '') +
                            ((item as { bolinma?: string; department?: string })
                              .bolinma ??
                              (item as { department?: string }).department ??
                              item._id)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </ModalField>
            </div>

            <ModalField label="Javobgar shaxs">
              {loadingUsers ?
                <p className="text-sm text-slate-500">Yuklanmoqda...</p>
              : <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className={modalFieldClass}>
                    <SelectValue placeholder="Foydalanuvchini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem
                        key={String(user.userId)}
                        value={String(user.userId)}>
                        {user.personal.fName} {user.personal.name}{' '}
                        {user.personal.sName}
                        {user.job?.militaryRank ?
                          ` — ${user.job.militaryRank}`
                        : ''}
                        {user.job?.department ?
                          ` (${user.job.department})`
                        : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            </ModalField>
          </ModalBody>

          <ModalFooterBar>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={saving}
              onClick={() => void handleSave()}>
              {saving ?
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saqlanmoqda...
                </>
              : 'Saqlash'}
            </Button>
          </ModalFooterBar>
        </DialogContent>
      </Dialog>
    </>
  );
}
