'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { useBolimlar } from '@/hooks/useBolimData';
import { useDepartments } from '@/hooks/useDepartments';
import { useSessionsUsers } from '@/hooks/useSessionsUsers';

export default function CreateNomeklatura() {
  const [open, setOpen] = useState(false);
  const { users, loading: loadingUsers } = useSessionsUsers();

  // Form states
  const [registrationIndex, setRegistrationIndex] = useState('');
  const [title, setTitle] = useState('');
  const [qonunTuri, setQonunTuri] = useState('');
  const [grif, setGrif] = useState('');
  const [saqlashMuddati, setSaqlashMuddati] = useState('');

  const [selectedOrgan, setSelectedOrgan] = useState(''); // Bolim
  const [selectedDepartment, setSelectedDepartment] = useState(''); // Bo‘linma
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

    // Tanlangan foydalanuvchini topamiz
    const selectedUser = users.find((u) => u.userId === selectedUserId);
    if (!selectedUser) {
      toast.error('Foydalanuvchi topilmadi');
      return;
    }

    const payload = {
      registrationIndex,
      title,
      grif,
      qonunTuri: qonunTuri || null,
      saqlashMuddati:
        saqlashMuddati === 'doimiy' ? 'doimiy' : parseInt(saqlashMuddati),
      bolinma: [selectedDepartment],
      bolim: [selectedOrgan],
      author: {
        userId: selectedUser.userId,
        fullName: `${selectedUser.personal.name} ${selectedUser.personal.fName} ${selectedUser.personal.sName}`,
        militaryRank: selectedUser.job.militaryRank,
        position: selectedUser.job.position, // modelda bor
        department: selectedUser.job.department,
        province: selectedUser.personal.province,
      },
    };

    try {
      await axios.post('/api/nameklatura/reg-nomeklatura', payload, {
        withCredentials: true,
      });
      toast.success('Nomeklatura muvaffaqiyatli yaratildi');
      setOpen(false);
      // Formani tozalash
      setRegistrationIndex('');
      setTitle('');
      setGrif('');
      setQonunTuri('');
      setSaqlashMuddati('');
      setSelectedOrgan('');
      setSelectedDepartment('');
      setSelectedUserId('');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Yaratishda xatolik yuz berdi'
      );
    }
  };

  const hasError = errorBolimlar || errorDepts;

  return (
    <div className="ml-2">
      <Button variant="outline" onClick={() => setOpen(true)}>
        + Nomeklatura yaratish
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi ish jild yaratish</DialogTitle>
          </DialogHeader>

          {hasError && (
            <p className="text-red-500">Ma`lumot yuklashda xatolik</p>
          )}

          <div className="space-y-4 py-4">
            {/* Raqami */}
            <div>
              <Label>Raqami</Label>
              <Input
                placeholder="01-2025"
                value={registrationIndex}
                onChange={(e) => setRegistrationIndex(e.target.value)}
              />
            </div>

            {/* Nomi */}
            <div>
              <Label>Nomi</Label>
              <Textarea
                placeholder="Ish jildining to'liq nomi..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={3}
              />
            </div>

            {/* Maxfiylik darajasi */}
            <div>
              <Label>Maxfiylik darajasi (grif)</Label>
              <Input
                placeholder="Ochik / Maxfiy / Davlat sir"
                value={grif}
                onChange={(e) => setGrif(e.target.value)}
              />
            </div>

            {/* Buyruq bandi */}
            <div>
              <Label>Buyruq bandi (ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: 15-band"
                value={qonunTuri}
                onChange={(e) => setQonunTuri(e.target.value)}
              />
            </div>

            {/* Saqlash muddati */}
            <div>
              <Label>Saqlash muddati</Label>
              <Select value={saqlashMuddati} onValueChange={setSaqlashMuddati}>
                <SelectTrigger>
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
            </div>

            {/* Bolim (organ) */}
            <div>
              <Label>Bolim</Label>
              <Select value={selectedOrgan} onValueChange={setSelectedOrgan}>
                <SelectTrigger>
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
            </div>

            {/* Bo‘linma (department) */}
            <div>
              <Label>Bo‘linma</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}>
                <SelectTrigger>
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
                        {((item as any).province
                          ? `${(item as any).province} — `
                          : '') +
                          ((item as any).bolinma ??
                            (item as any).department ??
                            item._id)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Javobgar shaxs */}
            <div>
              <Label>Javobgar shaxs</Label>
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
              ) : (
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Foydalanuvchini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        {user.personal.fName +
                          ' ' +
                          user.personal.name +
                          ' ' +
                          user.personal.sName}{' '}
                        — {user.job.militaryRank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
