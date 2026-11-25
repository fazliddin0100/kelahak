'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { createKeyAndCsr } from '@/lib/eimzo/keygen';
import { isEimzoSupported } from '@/lib/eimzo/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import EimzoPackagesCard, { type PackagesResponse } from './eimzo-packages';

type Ready = { login: string; csrName: string; keyName: string; fingerprint: string; issued: boolean };

type Candidate = {
  userId: string;
  login: string;
  fullName: string;
  position: string;
  approved: boolean;
  hasActiveCertificate: boolean;
};
type ShahobchaOption = { id: string; name: string; province: string; users: Candidate[] };

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50';

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
 * Serverda oraliq CA sozlangan bo'lsa (autoIssue): .mzk (kalit paroli bilan shifrlangan) va .csr
 * serverga yuboriladi, sertifikat avtomatik imzolanib userga biriktiriladi, tayyor paket
 * «Tayyor E-IMZO paketlari» bo'limida superadmin paroli bilan bir marta yuklab olinadi.
 * Aks holda — eski tartib: fayllar yuklab olinadi, .csr oflayn CA'da imzolanadi.
 */
export default function KeyRequestCard() {
  const [shahobchalar, setShahobchalar] = useState<ShahobchaOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [shahobchaId, setShahobchaId] = useState('');
  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState<Ready | null>(null);
  const secure = isEimzoSupported();
  const queryClient = useQueryClient();
  const packagesQuery = useQuery<PackagesResponse>({
    queryKey: ['superadmin-eimzo-packages'],
    queryFn: async () => {
      const r = await fetch('/api/superadmin/certificates/packages', { cache: 'no-store' });
      if (!r.ok) throw new Error('packages');
      return r.json();
    },
  });
  const autoIssue = packagesQuery.data?.autoIssue === true;

  // Tizimda ro'yxatdan o'tgan shahobchalar va ularning xodimlari
  useEffect(() => {
    let active = true;
    fetch('/api/superadmin/certificates/candidates', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { shahobchalar: [] }))
      .then((d) => active && setShahobchalar(Array.isArray(d.shahobchalar) ? d.shahobchalar : []))
      .catch(() => {})
      .finally(() => active && setListLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const shahobcha = useMemo(() => shahobchalar.find((s) => s.id === shahobchaId) ?? null, [shahobchalar, shahobchaId]);
  const candidate = useMemo(() => shahobcha?.users.find((u) => u.login === login) ?? null, [shahobcha, login]);
  const organization = shahobcha ? `${shahobcha.name} (${shahobcha.province})` : '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!shahobcha) return setError('Shahobchani tanlang.');
    const l = login.trim().toLowerCase();
    if (!candidate) return setError('Shu shahobchadagi userni (login) tanlang.');
    if (!fullName.trim()) return setError('F.I.Sh bo‘sh bo‘lmasin.');
    if (password.length < 10 || !/\p{L}/u.test(password) || !/\d/.test(password)) {
      return setError('Kalit paroli kamida 10 belgi, harf va raqam bilan bo‘lsin.');
    }
    if (password !== password2) return setError('Parollar bir xil emas.');

    setBusy(true);
    try {
      let r;
      try {
        r = await createKeyAndCsr({ login: l, fullName: fullName.trim(), organization: organization.trim(), password });
      } catch {
        setError('Kalit yaratib bo‘lmadi. Brauzer HTTPS orqali ochilganini tekshiring.');
        return;
      }
      setPassword('');
      setPassword2('');
      if (autoIssue) {
        const res = await fetch('/api/superadmin/certificates/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: candidate.userId, csrPem: r.csrPem, keyFileJson: r.keyFileJson }),
        });
        const d = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          setError(d.message || 'Sertifikatni serverda chiqarib bo‘lmadi.');
          return;
        }
        toast.success(d.message || 'E-IMZO tayyor');
        setReady({ login: l, csrName: '', keyName: '', fingerprint: r.publicKeySha256, issued: true });
        void queryClient.invalidateQueries({ queryKey: ['superadmin-eimzo-packages'] });
        void queryClient.invalidateQueries({ queryKey: ['superadmin-certificates'] });
        setShahobchalar((list) =>
          list.map((s) => ({
            ...s,
            users: s.users.map((u) => (u.userId === candidate.userId ? { ...u, hasActiveCertificate: true } : u)),
          }))
        );
        return;
      }
      download(`${l}.mzk`, r.keyFileJson, 'application/json');
      download(`${l}.csr`, r.csrPem, 'application/pkcs10');
      setReady({ login: l, csrName: `${l}.csr`, keyName: `${l}.mzk`, fingerprint: r.publicKeySha256, issued: false });
    } catch {
      setError('Server bilan aloqa uzildi. Qayta urinib ko‘ring.');
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
        {autoIssue ?
          <>
            Kalit shu brauzerda yaratiladi va kalit paroli bilan shifrlanib serverga yuboriladi. Sertifikatni serverdagi
            oraliq CA avtomatik imzolaydi va userga biriktiradi. Tayyor paketni pastdan superadmin paroli bilan bir
            marta yuklab olasiz.
          </>
        : <>
            Serverda oraliq CA sozlanmagan: kalit shu brauzerda yaratilib yuklab olinadi, so‘rov (.csr) oflayn
            kompyuterda imzolanadi.
          </>
        }
      </p>

      {!secure && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          Kalit yaratish faqat himoyalangan ulanishda (HTTPS yoki localhost) ishlaydi.
        </p>
      )}

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3" autoComplete="off">
        <div className="space-y-1.5">
          <Label htmlFor="kr-shahobcha">Shahobcha</Label>
          <select
            id="kr-shahobcha"
            className={selectClass}
            value={shahobchaId}
            disabled={listLoading}
            onChange={(e) => {
              setShahobchaId(e.target.value);
              setLogin('');
              setFullName('');
            }}>
            <option value="">{listLoading ? 'Yuklanmoqda...' : 'Shahobchani tanlang'}</option>
            {shahobchalar.map((s) => (
              <option key={s.id} value={s.id}>
                {s.province} — {s.name} ({s.users.length})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kr-login">User logini</Label>
          <select
            id="kr-login"
            className={selectClass}
            value={login}
            disabled={!shahobcha}
            onChange={(e) => {
              const u = shahobcha?.users.find((x) => x.login === e.target.value);
              setLogin(e.target.value);
              setFullName(u?.fullName ?? '');
            }}>
            <option value="">
              {!shahobcha ? 'Avval shahobchani tanlang'
              : shahobcha.users.length === 0 ? 'Bu shahobchada user yo‘q'
              : 'Loginni tanlang'}
            </option>
            {shahobcha?.users.map((u) => (
              <option key={u.userId} value={u.login}>
                {u.login} — {u.fullName}
                {u.hasActiveCertificate ? ' (sertifikati bor)' : ''}
                {!u.approved ? ' (tasdiqlanmagan)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kr-fio">F.I.Sh (sertifikatda)</Label>
          <Input
            id="kr-fio"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!candidate}
            placeholder="Login tanlanganda o‘zi to‘ladi"
          />
        </div>
        {candidate?.hasActiveCertificate && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 sm:col-span-3">
            {autoIssue ?
              'Bu userning faol sertifikati bor. Yangi paket yuklab olinganda eski sertifikat avtomatik bekor qilinadi.'
            : 'Bu userning faol sertifikati bor. Yangi kalit yaratsangiz, yangi sertifikatni biriktirgach eskisini bekor qiling.'}
          </p>
        )}
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
            {autoIssue ? 'E-IMZO yaratish' : 'Kalit va so‘rov yaratish'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-3">
            {error}
          </p>
        )}
      </form>

      {ready?.issued && (
        <div className="mt-4 space-y-1 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-medium">
            «{ready.login}» uchun E-IMZO tayyor: sertifikat imzolandi va userga biriktirildi.
          </p>
          <p>Paketni pastdagi «Tayyor E-IMZO paketlari» ro‘yxatidan yuklab oling. Kalit parolini userga og‘zaki bering.</p>
          <p className="break-all text-xs text-emerald-800">
            Ochiq kalit barmoq izi: <span className="font-mono">{ready.fingerprint}</span>
          </p>
        </div>
      )}

      {ready && !ready.issued && (
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

      <EimzoPackagesCard query={packagesQuery} />
    </section>
  );
}
