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
import {
  AgentUnavailableError,
  getDeviceAttestation,
  KeyNotOnUsbError,
  listUsbKeys,
  type DeviceAttestation,
  type UsbKey,
} from '@/lib/eimzo/agentClient';
import { EimzoClientError, isEimzoSupported, readCertificateFile, signWithKey, unlockKeyFile } from '@/lib/eimzo/client';
import { clearSignSession, getSignSession, startSignSession, takeClosedByUsb } from '@/lib/eimzo/signSession';
import {
  documentSignMessage,
  finishEimzoSignature,
  getPendingEimzoSign,
  subscribeEimzoSign,
  type DocumentSignChallenge,
} from '@/lib/eimzo/signRequest';
import { FileKey2, KeyRound, Loader2, LockOpen, PenLine, RefreshCw, Usb } from 'lucide-react';
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';

const USB_REMOVED = 'Fleshka olib qo‘yildi — kalit yopildi. Fleshkani ulang va parolni qayta kiriting.';

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
  const [error, setError] = useState(() => (takeClosedByUsb() ? USB_REMOVED : ''));
  const [now, setNow] = useState(() => Date.now());
  // Oyna ochilganda: 1 soat ichida parol kiritilgan va fleshka ulangan bo'lsa — kalit xotirada ochiq
  const [session, setSession] = useState(() => getSignSession());
  // Fleshkadagi kalitlar: undefined — qidirilmoqda, null — Mezon agenti yo'q
  const [usbKeys, setUsbKeys] = useState<UsbKey[] | null | undefined>(undefined);
  const [selectedSha, setSelectedSha] = useState('');

  const applyKeys = useCallback((keys: UsbKey[] | null) => {
    setUsbKeys(keys);
    setSelectedSha((prev) => (keys?.some((k) => k.keySha256 === prev) ? prev : (keys?.[0]?.keySha256 ?? '')));
  }, []);
  const scanUsb = useCallback(() => {
    setUsbKeys(undefined);
    void listUsbKeys().then(applyKeys);
  }, [applyKeys]);

  useEffect(() => {
    let active = true;
    void listUsbKeys().then((keys) => active && applyKeys(keys));
    return () => {
      active = false;
    };
  }, [applyKeys]);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      const s = getSignSession(); // 1 soat tugasa yoki fleshka olinsa — parol formasi qaytadi
      if (!s && takeClosedByUsb()) {
        setError(USB_REMOVED);
        scanUsb();
      }
      setSession(s);
    }, 1000);
    return () => clearInterval(t);
  }, [scanUsb]);

  const secondsLeft = Math.max(0, Math.round((new Date(challenge.expiresAt).getTime() - now) / 1000));
  const expired = secondsLeft === 0;
  const secure = isEimzoSupported();
  const agentMissing = usbKeys === null;
  // Agent bor — kalit faqat fleshkadan. Agent yo'q va kompyuter talab qilinmasa — fayl tanlash (o'tish davri)
  const legacyFiles = agentMissing && !challenge.deviceRequired;
  const selected = usbKeys?.find((k) => k.keySha256 === selectedSha) ?? null;

  const sign = async (key: CryptoKey, certPem: string, keySha256: string) => {
    const origin = window.location.origin;
    let device: DeviceAttestation | undefined;
    if (keySha256) {
      // Agent: kompyuter (MAC, disk) va kalit shu paytda fleshkada turgani tasdiqlanadi
      device = await getDeviceAttestation(challenge.nonce, keySha256);
    } else if (challenge.deviceRequired) {
      throw new AgentUnavailableError('Imzolash uchun kompyuterda «Mezon agenti» ishlab turishi va kalit fleshkasi ulangan bo‘lishi kerak.');
    }
    const signature = await signWithKey(key, documentSignMessage(challenge, origin));
    finishEimzoSignature({ challengeId: challenge.challengeId, origin, certPem, signature, device });
  };

  const closeSession = (message: string) => {
    clearSignSession();
    setSession(null);
    setError(message);
    scanUsb();
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
      await sign(s.key, s.certPem, s.keySha256);
    } catch (err) {
      if (err instanceof KeyNotOnUsbError) closeSession(USB_REMOVED);
      else if (err instanceof AgentUnavailableError) setError(err.message);
      else closeSession('Imzolab bo‘lmadi. Parolni qayta kiriting.');
    } finally {
      setBusy(false);
    }
  };

  const submitWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Kalit parolini kiriting.');
      return;
    }
    let keySource: File | string;
    let keySha256 = '';
    let label: string;
    let certPem: string | null = null;
    if (legacyFiles) {
      if (!certFile || !keyFile) {
        setError('Sertifikat va kalit faylini tanlang.');
        return;
      }
      keySource = keyFile;
      label = keyFile.name;
    } else {
      if (!selected) {
        setError('Fleshkada E-IMZO kaliti topilmadi. Kalit yozilgan fleshkani ulang.');
        return;
      }
      if (!selected.certPem && !certFile) {
        setError('Fleshkada sertifikat (.crt) topilmadi — uni tanlang.');
        return;
      }
      keySource = selected.keyFile;
      keySha256 = selected.keySha256;
      label = `${selected.drive}${selected.fileName}`;
      certPem = selected.certPem;
    }

    setBusy(true);
    try {
      const pem = certPem ?? (await readCertificateFile(certFile as File));
      const key = await unlockKeyFile(keySource, password);
      setPassword('');
      // Parol kiritilgan paytdan 1 soat davomida (fleshka ulangan ekan) keyingi imzolar parolsiz
      startSignSession(key, pem, label, keySha256);
      await sign(key, pem, keySha256);
    } catch (err) {
      if (err instanceof KeyNotOnUsbError) {
        closeSession(USB_REMOVED);
      } else {
        setError(
          err instanceof EimzoClientError || err instanceof AgentUnavailableError ?
            err.message
          : 'Kalitni ochib bo‘lmadi. Fayllarni tekshiring.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const useOtherKey = () => {
    clearSignSession();
    setSession(null);
    setError('');
    scanUsb();
  };

  const sessionMinutes = session ? Math.max(1, Math.ceil((session.expiresAt - now) / 60000)) : 0;
  const sessionUntil =
    session ? new Date(session.expiresAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';
  const canSubmit = !!session || legacyFiles || !!selected;

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
                Parol {sessionUntil} gacha so‘ralmaydi (yana {sessionMinutes} daqiqa).
                {session.keySha256 ? ' Fleshka olib qo‘yilsa kalit darhol yopiladi.' : ''} Sahifa yangilansa yoki
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
              {legacyFiles ?
                <>
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                    Kompyuterda «Mezon agenti» topilmadi — kalit faylini qo‘lda tanlang.
                  </p>
                  <FilePick id="sign-cert" icon={<FileKey2 className="size-4" />} label="Sertifikat (.crt)" accept=".crt,.cer,.pem" onFile={setCertFile} />
                  <FilePick id="sign-key" icon={<KeyRound className="size-4" />} label="Kalit fayli (.mzk)" accept=".mzk" onFile={setKeyFile} />
                </>
              : <UsbKeyPicker
                  keys={usbKeys}
                  agentMissing={agentMissing}
                  selectedSha={selectedSha}
                  onSelect={setSelectedSha}
                  onRescan={scanUsb}
                  disabled={busy}
                />
              }
              {!legacyFiles && selected && !selected.certPem && (
                <FilePick id="sign-cert" icon={<FileKey2 className="size-4" />} label="Sertifikat (.crt) — fleshkada topilmadi" accept=".crt,.cer,.pem" onFile={setCertFile} />
              )}
              {canSubmit && (
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
                  <p className="text-xs text-slate-500">
                    Parol kiritilgach 1 soat davomida keyingi imzolarda so‘ralmaydi
                    {legacyFiles ? '.' : ' (fleshka ulangan ekan).'}
                  </p>
                </div>
              )}
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
              <Button type="submit" disabled={busy || expired || !secure || !canSubmit} className="gap-2">
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

function FilePick(props: { id: string; icon: ReactNode; label: string; accept: string; onFile: (f: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id} className="flex items-center gap-2">
        {props.icon} {props.label}
      </Label>
      <Input id={props.id} type="file" accept={props.accept} onChange={(e) => props.onFile(e.target.files?.[0] ?? null)} className="cursor-pointer" />
    </div>
  );
}

function UsbKeyPicker(props: {
  keys: UsbKey[] | null | undefined;
  agentMissing: boolean;
  selectedSha: string;
  onSelect: (sha: string) => void;
  onRescan: () => void;
  disabled: boolean;
}) {
  const { keys } = props;
  const rescan = (
    <button
      type="button"
      onClick={props.onRescan}
      disabled={props.disabled || keys === undefined}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50">
      <RefreshCw className="size-3" /> Qayta qidirish
    </button>
  );

  if (keys === undefined) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
        <Loader2 className="size-4 animate-spin" /> Fleshkadagi E-IMZO kaliti qidirilmoqda...
      </p>
    );
  }
  if (props.agentMissing) {
    return (
      <div role="alert" className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
        <p>Imzo faqat ro‘yxatga olingan kompyuterdan qabul qilinadi: «Mezon agenti» ishlab turishi kerak.</p>
        {rescan}
      </div>
    );
  }
  if (!keys || keys.length === 0) {
    return (
      <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
        <p className="flex items-center gap-2 font-medium">
          <Usb className="size-4" /> Fleshkada E-IMZO kaliti topilmadi
        </p>
        <p className="text-xs">Kalit (.mzk) va sertifikat (.crt) yozilgan fleshkani kompyuterga ulang.</p>
        {rescan}
      </div>
    );
  }
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-2">
          <Usb className="size-4" /> Fleshkadagi kalit
        </span>
        {rescan}
      </legend>
      {keys.map((k) => (
        <label
          key={k.keySha256}
          className="flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 has-[:checked]:bg-sky-50 has-[:checked]:ring-sky-300">
          <input
            type="radio"
            name="usb-key"
            className="mt-1"
            checked={props.selectedSha === k.keySha256}
            onChange={() => props.onSelect(k.keySha256)}
            disabled={props.disabled}
          />
          <span className="min-w-0">
            <span className="block font-medium text-slate-800">
              {k.drive}
              {k.fileName}
            </span>
            <span className="block text-xs text-slate-500">
              {k.usbModel || 'Fleshka'} · {k.certPem ? 'sertifikat bor' : 'sertifikat topilmadi'}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
