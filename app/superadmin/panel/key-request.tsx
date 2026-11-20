'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createKeyAndCsr } from '@/lib/eimzo/keygen';
import { isEimzoSupported } from '@/lib/eimzo/client';
import { Download, KeyRound, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Ready = { login: string; csrName: string; keyName: string; fingerprint: string };

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 1-qadam: userga E-IMZO kaliti va sertifikat so'rovi brauzerda yaratiladi.
 * Serverga hech narsa yuborilmaydi: .mzk (shifrlangan kalit) userning fleshkasiga,
 * .csr oflayn CA kompyuteriga (scripts/pki/sign-csr.sh) olib boriladi.
 */
export default function KeyRequestCard() {
  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState<Ready | null>(null);
  const secure = isEimzoSupported();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const l = login.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,50}$/.test(l)) return setError('Login: kichik lotin harflari, raqam, _ va - (3–50 belgi).');
    if (!fullName.trim() || !organization.trim()) return setError('F.I.Sh va tashkilot nomini kiriting.');
    if (password.length < 10 || !/\p{L}/u.test(password) || !/\d/.test(password)) {
      return setError('Kalit paroli kamida 10 belgi, harf va raqam bilan bo‘lsin.');
    }
    if (password !== password2) return setError('Parollar bir xil emas.');

    setBusy(true);
    try {
      const r = await createKeyAndCsr({ login: l, fullName: fullName.trim(), organization: organization.trim(), password });
      download(`${l}.mzk`, r.keyFileJson, 'application/json');
      download(`${l}.csr`, r.csrPem, 'application/pkcs10');
      setReady({ login: l, csrName: `${l}.csr`, keyName: `${l}.mzk`, fingerprint: r.publicKeySha256 });
      setPassword('');
      setPassword2('');
    } catch {
      setError('Kalit yaratib bo‘lmadi. Brauzer HTTPS orqali ochilganini tekshiring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <KeyRound className="size-4 text-primary" />
        1. Kalit va sertifikat so‘rovini yaratish
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Kalit shu brauzerda yaratiladi va serverga yuborilmaydi. Sertifikat markazi oflayn: so‘rov (.csr) oflayn
        kompyuterda imzolanadi.
      </p>

      {!secure && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          Kalit yaratish faqat himoyalangan ulanishda (HTTPS yoki localhost) ishlaydi.
        </p>
      )}

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3" autoComplete="off">
        <div className="space-y-1.5">
          <Label htmlFor="kr-login">User logini</Label>
          <Input id="kr-login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="masalan: aliyev_a" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kr-fio">F.I.Sh (sertifikatda)</Label>
          <Input id="kr-fio" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Aliyev Anvar Akmalovich" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kr-org">Tashkilot / shahobcha</Label>
          <Input id="kr-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Toshkent shahobchasi" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kr-pass">Kalit paroli</Label>
          <Input id="kr-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kr-pass2">Parolni takrorlang</Label>
          <Input id="kr-pass2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy || !secure} className="w-full gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Kalit va so‘rov yaratish
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-3">
            {error}
          </p>
        )}
      </form>

      {ready && (
        <div className="mt-4 space-y-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-medium">«{ready.login}» uchun ikki fayl yuklab olindi:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <b>{ready.keyName}</b> — userning fleshkasiga yozing va kompyuterdan o‘chiring. Kalit parolini userga
              alohida, og‘zaki bering.
            </li>
            <li>
              <b>{ready.csrName}</b> — oflayn CA kompyuterida imzolang:
              <code className="mt-1 block rounded bg-white/70 px-2 py-1 font-mono text-xs">
                bash scripts/pki/sign-csr.sh {ready.csrName} {ready.login}
              </code>
            </li>
            <li>Chiqqan <b>{ready.login}.crt</b> ni pastdagi «2. Sertifikatni biriktirish» orqali userga biriktiring.</li>
          </ol>
          <p className="break-all text-xs text-emerald-800">
            Ochiq kalit barmoq izi (imzolashda solishtiring): <span className="font-mono">{ready.fingerprint}</span>
          </p>
        </div>
      )}
    </section>
  );
}
