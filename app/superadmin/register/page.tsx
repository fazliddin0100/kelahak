'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/sonner';
import {
  provinces,
  registrationFieldLabels,
  registrationFormSchema,
  type RegistrationFormData,
} from '@/lib/registrationConstants';
import { KeyRound, Shield } from 'lucide-react';
import Link from 'next/link';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const useCheckUser = (login: string) => {
  const debouncedLogin = useDebounce(login.trim(), 500);
  return useQuery({
    queryKey: ['check-login-sa', debouncedLogin],
    queryFn: async () => {
      if (!debouncedLogin || debouncedLogin.length < 3) {
        return { exists: false };
      }
      const res = await fetch(
        `/api/auth/check-user?login=${encodeURIComponent(debouncedLogin)}`
      );
      if (!res.ok) return { exists: false };
      return res.json();
    },
    enabled: !!debouncedLogin && debouncedLogin.length >= 3,
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export default function SuperAdminRegisterPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [setup, setSetup] = useState<{
    needsBootstrap: boolean;
    bootstrapConfigured: boolean;
  } | null>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      fName: '',
      name: '',
      sName: '',
      province: '',
      organ: 'DXX',
      department: '',
      position: '',
      militaryRank: '',
      login: '',
      password: '',
    },
  });

  useEffect(() => {
    fetch('/api/superadmin/setup-status')
      .then((r) => r.json())
      .then(setSetup)
      .catch(() => setSetup(null));
  }, []);

  const loginValue = form.watch('login') || '';
  const { data: loginCheck, isLoading, isFetching } = useCheckUser(loginValue);
  const passwordValue = form.watch('password') || '';

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 3);
  };
  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (values: RegistrationFormData) => {
    if (loginCheck?.exists) {
      toast.error('Bu login allaqachon band');
      return;
    }
    if (!bootstrapKey.trim()) {
      toast.error('Bootstrap kalitni kiriting');
      return;
    }

    try {
      const res = await fetch('/api/superadmin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, bootstrapKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Xatolik');
        return;
      }
      toast.success(data.message);
      router.push('/superadmin/login');
    } catch {
      toast.error('Server xatosi');
    }
  };

  const isLoginChecking = isLoading || isFetching;
  const isLoginTaken = !!loginCheck?.exists;
  const canSubmit =
    !form.formState.isSubmitting && !isLoginChecking && !isLoginTaken;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-violet-500/20 bg-white/95 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-600">
            <Shield className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              SuperAdmin ro‘yxatdan o‘tish
            </h1>
            <p className="text-xs text-slate-500">
              {setup?.needsBootstrap
                ? 'Birinchi marta tizim sozlash'
                : 'Qo‘shimcha SuperAdmin (maxfiy kalit kerak)'}
            </p>
          </div>
        </div>

        {setup && !setup.bootstrapConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            .env da <code className="font-mono">SUPERADMIN_BOOTSTRAP_KEY</code>{' '}
            o‘rnating.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(['fName', 'name', 'sName'] as const).map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{registrationFieldLabels[field]}</FormLabel>
                      <FormControl>
                        <Input {...f} placeholder={registrationFieldLabels[field]} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Viloyat</FormLabel>
                    <FormControl>
                      <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className="w-full justify-between text-left font-normal">
                            {field.value || 'Viloyatni tanlang'} <span>▼</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Viloyatni tanlang</DialogTitle>
                          </DialogHeader>
                          <RadioGroup
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              setOpen(false);
                            }}
                            className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-2">
                            {provinces.map((p) => (
                              <div
                                key={p}
                                className="flex cursor-pointer items-center space-x-3 rounded p-2 hover:bg-gray-50">
                                <RadioGroupItem value={p} id={`sa-${p}`} />
                                <label htmlFor={`sa-${p}`} className="flex-1 cursor-pointer">
                                  {p}
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </DialogContent>
                      </Dialog>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(['organ', 'department'] as const).map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{registrationFieldLabels[field]}</FormLabel>
                      <FormControl>
                        <Input {...f} placeholder={registrationFieldLabels[field]} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(['position', 'militaryRank'] as const).map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{registrationFieldLabels[field]}</FormLabel>
                      <FormControl>
                        <Input {...f} placeholder={registrationFieldLabels[field]} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Login</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        onChange={(e) => field.onChange(e.target.value.trim())}
                      />
                    </FormControl>
                    <div className="min-h-5 text-xs">
                      {isLoginChecking ?
                        <span className="text-slate-400">Tekshirilmoqda...</span>
                      : loginValue.length < 3 ?
                        <span className="text-amber-600">Kamida 3 belgi</span>
                      : isLoginTaken ?
                        <span className="text-red-600">Login band</span>
                      : <span className="text-emerald-600">Mumkin ✓</span>}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parol</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" autoComplete="new-password" />
                    </FormControl>
                    {passwordValue && (
                      <div className="mt-1 flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full ${
                              strength >= level
                                ? strength === 1
                                  ? 'bg-red-400'
                                  : strength === 2
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-500" />
              <Input
                className="pl-10"
                placeholder="Bootstrap kalit (SUPERADMIN_BOOTSTRAP_KEY)"
                value={bootstrapKey}
                onChange={(e) => setBootstrapKey(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-violet-600 hover:bg-violet-500">
              {form.formState.isSubmitting ? 'Yaratilmoqda...' : 'SuperAdmin yaratish'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/superadmin/login" className="text-violet-600 hover:underline">
            Kirish sahifasiga
          </Link>
        </p>
      </div>
    </div>
  );
}
