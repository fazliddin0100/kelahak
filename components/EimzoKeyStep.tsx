'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileKey2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  EimzoClientError,
  isEimzoSupported,
  readCertificateFile,
  signWithKeyFile,
} from '@/lib/eimzo/client';

/**
 * E-IMZO bosqichi. Fleshkadagi `.crt` (ochiq sertifikat) va `.mzk` (parol bilan
 * shifrlangan yopiq kalit) fayllari tanlanadi. Kalit faqat shu sahifaning xotirasida
 * WebCrypto orqali ochiladi va chiqarib olib bo'lmaydigan CryptoKey sifatida ishlatiladi.
 * Brauzerda (localStorage, IndexedDB, cookie) hech narsa saqlanmaydi.
 */

export type EimzoChallenge = { challengeId: string; nonce: string; expiresAt: string };

export default function EimzoKeyStep({
  challenge,
  onSuccess,
  onCancel,
}: {
  challenge: EimzoChallenge;
  onSuccess: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000))
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [challenge.expiresAt]);

  const expired = secondsLeft === 0;
  const secure = isEimzoSupported();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!certFile || !keyFile || !password) {
      setError('Sertifikat, kalit fayli va kalit parolini kiriting.');
      return;
    }
    setBusy(true);
    try {
      const certPem = await readCertificateFile(certFile);
      const origin = window.location.origin;
      const signature = await signWithKeyFile(
        keyFile,
        password,
        `mezon-login|${challenge.challengeId}|${challenge.nonce}|${origin}`
      );
      setPassword('');
      const res = await fetch('/api/auth/eimzo/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ challengeId: challenge.challengeId, origin, certPem, signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'E-IMZO tekshiruvidan o‘tmadi.');
        if (['CHALLENGE_EXPIRED', 'NO_CHALLENGE'].includes(data.code)) onCancel();
        return;
      }
      formRef.current?.reset();
      onSuccess(data);
    } catch (err) {
      setError(err instanceof EimzoClientError ? err.message : 'Kalitni ochib bo‘lmadi. Fayllarni tekshiring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5" autoComplete="off">
      <div className="flex items-start gap-3 rounded-xl bg-primary-soft p-3 text-sm text-primary">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <p>
          Parol to‘g‘ri. Endi fleshkadagi E-IMZO kalitingiz bilan tasdiqlang. Kalit faqat shu sahifada ochiladi
          va hech qayerda saqlanmaydi.
        </p>
      </div>

      {!secure && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          E-IMZO faqat himoyalangan ulanishda (HTTPS) ishlaydi. Administratorga murojaat qiling.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="eimzo-cert" className="flex items-center gap-2">
          <FileKey2 className="size-4" /> Sertifikat (.crt)
        </Label>
        <Input
          id="eimzo-cert"
          type="file"
          accept=".crt,.cer,.pem"
          onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
          className="h-11 cursor-pointer"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eimzo-key" className="flex items-center gap-2">
          <KeyRound className="size-4" /> Kalit fayli (.mzk)
        </Label>
        <Input
          id="eimzo-key"
          type="file"
          accept=".mzk"
          onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)}
          className="h-11 cursor-pointer"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eimzo-pass">Kalit paroli</Label>
        <Input
          id="eimzo-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          placeholder="E-IMZO kalitining paroli"
          className="h-11"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy || expired || !secure}
        className="h-12 w-full gap-2 text-lg font-semibold">
        {busy && <Loader2 className="size-5 animate-spin" />}
        {expired ? 'Vaqt tugadi' : 'E-IMZO bilan kirish'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onCancel} className="font-medium text-primary hover:underline">
          ← Orqaga
        </button>
        <span className={expired ? 'text-red-600' : 'text-slate-500'} aria-live="polite">
          {expired ?
            'Muddat tugadi — qayta kiring'
          : `Qolgan vaqt: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
        </span>
      </div>
    </form>
  );
}
