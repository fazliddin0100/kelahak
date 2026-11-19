'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EimzoClientError, isEimzoSupported, readCertificateFile, signWithKeyFile } from '@/lib/eimzo/client';
import {
  documentSignMessage,
  finishEimzoSignature,
  getPendingEimzoSign,
  subscribeEimzoSign,
  type DocumentSignChallenge,
} from '@/lib/eimzo/signRequest';
import { FileKey2, KeyRound, Loader2, PenLine } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';

/** Hujjat sahifasiga bir marta qo'yiladi: requestEimzoSignature() chaqirilganda imzolash oynasini ochadi. */
export default function EimzoSignHost() {
  const challenge = useSyncExternalStore(subscribeEimzoSign, getPendingEimzoSign, () => null);
  if (!challenge) return null;
  return <SignDialog key={challenge.challengeId} challenge={challenge} />;
}

function SignDialog({ challenge }: { challenge: DocumentSignChallenge }) {
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(challenge.expiresAt));

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(remaining(challenge.expiresAt)), 1000);
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
      const signature = await signWithKeyFile(keyFile, password, documentSignMessage(challenge, origin));
      setPassword('');
      finishEimzoSignature({ challengeId: challenge.challengeId, origin, certPem, signature });
    } catch (err) {
      setError(err instanceof EimzoClientError ? err.message : 'Kalitni ochib bo‘lmadi. Fayllarni tekshiring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && finishEimzoSignature(null)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-5 text-primary" />
              Hujjatni E-IMZO bilan imzolash
            </DialogTitle>
            <DialogDescription>
              «{challenge.title || 'Hujjat'}» joriy mazmuni imzolanadi. Imzodan keyin hujjat o‘zgartirilsa, bu
              imzolar ro‘yxatida ko‘rinadi.
            </DialogDescription>
          </DialogHeader>

          <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">
            SHA-256: {challenge.contentHash}
          </p>

          {!secure && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              E-IMZO faqat himoyalangan ulanishda (HTTPS) ishlaydi.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sign-cert" className="flex items-center gap-2">
              <FileKey2 className="size-4" /> Sertifikat (.crt)
            </Label>
            <Input id="sign-cert" type="file" accept=".crt,.cer,.pem" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} className="cursor-pointer" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sign-key" className="flex items-center gap-2">
              <KeyRound className="size-4" /> Kalit fayli (.mzk)
            </Label>
            <Input id="sign-key" type="file" accept=".mzk" onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)} className="cursor-pointer" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sign-pass">Kalit paroli</Label>
            <Input
              id="sign-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              placeholder="E-IMZO kalitining paroli"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className={expired ? 'text-sm text-red-600' : 'text-sm text-slate-500'} aria-live="polite">
              {expired ? 'Vaqt tugadi — qayta bosing' : `Qolgan vaqt: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => finishEimzoSignature(null)} disabled={busy}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={busy || expired || !secure} className="gap-2">
                {busy && <Loader2 className="size-4 animate-spin" />}
                Imzolash
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function remaining(expiresAt: string) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}
