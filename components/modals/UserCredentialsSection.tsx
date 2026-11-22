'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

/** Kuchli tasodifiy parol: 14 belgi, harf va raqam albatta bor (o'xshash belgilar yo'q) */
function generatePassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const rnd = new Uint32Array(14);
  crypto.getRandomValues(rnd);
  const chars = Array.from(rnd, (n) => all[n % all.length]);
  chars[0] = letters[rnd[0] % letters.length];
  chars[1] = digits[rnd[1] % digits.length];
  // Aralashtirish
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Admin: xodimning loginini va parolini o'zgartirish (tahrirlash oynasi ichida) */
export default function UserCredentialsSection({
  userId,
  currentLogin,
  onSaved,
}: {
  userId: string;
  currentLogin: string;
  onSaved?: () => void | Promise<void>;
}) {
  const [login, setLogin] = useState(currentLogin);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const loginChanged = login.trim().toLowerCase() !== currentLogin;
  const canSave = (loginChanged || password.length > 0) && !saving;

  const save = async () => {
    if (password && password !== confirm) return toast.error('Parollar bir xil emas');
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/credentials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(loginChanged ? { login: login.trim().toLowerCase() } : {}),
          ...(password ? { password } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.message || 'Saqlab bo‘lmadi');
      toast.success(data.message || 'Saqlandi');
      if (data.warning) toast.warning(data.warning, { duration: 8000 });
      setPassword('');
      setConfirm('');
      await onSaved?.();
    } catch {
      toast.error('Server xatosi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <KeyRound className="size-4 text-amber-600" />
        Kirish ma’lumotlari
      </p>
      <label className="block text-sm font-medium text-slate-700">
        Login
        <Input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          maxLength={40}
          autoComplete="off"
          className="mt-1 font-mono"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Yangi parol
          <div className="relative mt-1">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="o‘zgartirmaslik uchun bo‘sh"
              className="pr-9 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Parolni takrorlang
          <Input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="mt-1 font-mono"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Login: kichik lotin harflari, raqam, «-» yoki «_». Parol: kamida 12 belgi, harf va raqam bo‘lsin. Saqlangach xodimning ochiq sessiyalari yopiladi — u yangi parol bilan
        kiradi. Parolni xodimga xavfsiz yo‘l bilan (yuzma-yuz) yetkazing.
      </p>
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const p = generatePassword();
              setPassword(p);
              setConfirm(p);
              setShow(true);
            }}>
            <Wand2 className="size-4" /> Parol yaratish
          </Button>
          {password && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(password);
                  toast.success('Parol nusxalandi');
                } catch {
                  toast.error('Nusxalab bo‘lmadi');
                }
              }}>
              <Copy className="size-4" /> Nusxalash
            </Button>
          )}
        </div>
        <Button type="button" size="sm" onClick={save} disabled={!canSave} className="gap-1.5">
          {saving && <Loader2 className="size-4 animate-spin" />}
          Login/parolni saqlash
        </Button>
      </div>
    </div>
  );
}
