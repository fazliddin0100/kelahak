'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Kirish muvaffaqiyatsiz');
        return;
      }
      if (data.token) {
        localStorage.setItem('sa_token', data.token);
        localStorage.setItem('token', data.token);
      }
      toast.success('Xush kelibsiz, SuperAdmin!');
      router.push('/superadmin/panel');
    } catch {
      toast.error('Server xatosi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-[#102c50]">
            <Shield className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SuperAdmin</h1>
          <p className="mt-1 text-sm text-slate-500">Tizim boshqaruv paneli</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Login
            </label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="superadmin"
              className="h-11"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Parol
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11"
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#102c50] hover:bg-[#173c68]">
            {loading ? 'Kirish...' : 'Kirish'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Hisobingiz yo‘qmi?{' '}
          <Link
            href="/superadmin/register"
            className="font-medium text-[#102c50] hover:underline">
            Ro‘yxatdan o‘tish
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-400">
          <Link href="/sign-in" className="hover:text-slate-600">
            Oddiy foydalanuvchi kirishi →
          </Link>
        </p>
      </div>
    </div>
  );
}
