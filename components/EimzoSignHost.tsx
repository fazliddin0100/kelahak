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
import { AgentUnavailableError, getDeviceAttestation, type DeviceAttestation } from '@/lib/eimzo/agentClient';
import { EimzoClientError, isEimzoSupported, readCertificateFile, signWithKey, unlockKeyFile } from '@/lib/eimzo/client';
import { clearSignSession, getSignSession, startSignSession } from '@/lib/eimzo/signSession';
import {
  documentSignMessage,
  finishEimzoSignature,
  getPendingEimzoSign,
  subscribeEimzoSign,
  type DocumentSignChallenge,
} from '@/lib/eimzo/signRequest';
import { FileKey2, KeyRound, Loader2, LockOpen, PenLine } from 'lucide-react';
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
  const [now, setNow] = useState(() => Date.now());
  // Oyna ochilganda: 1 soat ichida parol kiritilgan bo'lsa — kalit xotirada ochiq
  const [session, setSession] = useState(() => getSignSession());

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setSession(getSignSession()); // 1 soat tugasa — parol formasi qaytadi
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = Math.max(0, Math.round((new Date(challenge.expiresAt).getTime() - now) / 1000));
  const expired = secondsLeft === 0;
  const secure = isEimzoSupported();

  const sign = async (key: CryptoKey, certPem: string) => {
    const origin = window.location.origin;
    // Kompyuter tasdig'i (Mezon agenti). Talab qilinmasa va agent yo'q bo'lsa — usiz imzolanadi
    let device: DeviceAttestation | undefined;
    try {
      device = await getDeviceAttestation(challenge.nonce);
    } catch (err) {
      if (challenge.deviceRequired) throw err;
    }
    const signature = await signWithKey(key, documentSignMessage(challenge, origin));
    finishEimzoSignature({ challengeId: challenge.challengeId, origin, certPem, signature, device });
  };

  const submitWithSession = async (e: FormEvent) => {
    e.preventDefault();
    const s = getSignSession();
    if (!s) {
      setSession(null);
      setError('Kalit paroli muddati tugadi (1 soat). Parolni qayta kiriting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sign(s.key, s.certPem);
    } catch (err) {
      if (err instanceof AgentUnavailableError) {
        setError(err.message);
      } else {
        setError('Imzolab bo‘lmadi. Kalitni qayta tanlang.');
        clearSignSession();
        setSession(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!certFile || !keyFile || !password) {
      setError('Sertifikat, kalit fayli va kalit parolini kiriting.');
      return;
    }
    setBusy(true);
    try {
      const certPem = await readCertificateFile(certFile);
      const key = await unlockKeyFile(keyFile, password);
      setPassword('');
      // Parol kiritilgan paytdan 1 soat davomida keyingi imzolar parolsiz
      startSignSession(key, certPem, keyFile.name);
      await sign(key, certPem);
    } catch (err) {
      setError(
        err instanceof EimzoClientError || err instanceof AgentUnavailableError ?
          err.message
        : 'Kalitni ochib bo‘lmadi. Fayllarni tekshiring.'
      );
    } finally {
      setBusy(false);
    }
  };

  const useOtherKey = () => {
    clearSignSession();
    setSession(null);
    setError('');
  };

  const sessionMinutes = session ? Math.max(1, Math.ceil((session.expiresAt - now) / 60000)) : 0;
  const sessionUntil =
    session ? new Date(session.expiresAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && finishEimzoSignature(null)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={session ? submitWithSession : submitWithPassword} className="space-y-4" autoComplete="off">
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

          {challenge.deviceRequired && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 ring-1 ring-sky-200">
              Imzo faqat ro‘yxatga olingan kompyuterdan qabul qilinadi: «Mezon agenti» ishlab turishi kerak.
            </p>
          )}

          {!secure && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              E-IMZO faqat himoyalangan ulanishda (HTTPS) ishlaydi.
            </p>
          )}

          {session ?
            <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <p className="flex items-center gap-2 font-medium">
                <LockOpen className="size-4" /> Kalit ochiq: {session.label}
              </p>
              <p className="text-xs text-emerald-800">
                Parol {sessionUntil} gacha so‘ralmaydi (yana {sessionMinutes} daqiqa). Keyin, sahifa yangilansa yoki
                tizimdan chiqsangiz parol qayta so‘raladi.
              </p>
              <button
                type="button"
                onClick={useOtherKey}
                disabled={busy}
                className="text-xs font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
                Boshqa kalit bilan imzolash
              </button>
            </div>
          : <>
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
                <p className="text-xs text-slate-500">Parol kiritilgach 1 soat davomida keyingi imzolarda so‘ralmaydi.</p>
              </div>
            </>
          }

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
