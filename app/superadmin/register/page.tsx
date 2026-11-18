'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Eye, EyeOff, KeyRound, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';

/** Serverdagi `lib/passwordPolicy.ts` bilan bir xil qiymat */
const PASSWORD_MIN_LENGTH = 12;
const NAME_MAX = 150;

/** Bo‘sh joydan iborat qiymatlarni ham rad etadi */
const requiredName = (label: string) =>
  z
    .string()
    .max(NAME_MAX, `${label} ko‘pi bilan ${NAME_MAX} belgi bo‘lishi kerak`)
    .refine((value) => value.trim().length > 0, `${label} majburiy`);

const formSchema = z.object({
  fName: requiredName('Familiya'),
  name: requiredName('Ism'),
  sName: requiredName('Otasining ismi'),
  login: z
    .string()
    .refine(
      (value) => value.trim().length >= 3,
      'Login kamida 3 belgidan iborat bo‘lishi kerak'
    )
    .refine(
      (value) => value.trim().length <= 50,
      'Login ko‘pi bilan 50 belgidan iborat bo‘lishi kerak'
    )
    .refine(
      (value) => /^[A-Za-z0-9_-]+$/.test(value.trim()),
      'Login faqat harf, raqam, _ va - belgilaridan iborat bo‘lsin'
    ),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Parol kamida ${PASSWORD_MIN_LENGTH} belgidan iborat bo‘lishi kerak`
    )
    .max(72, 'Parol ko‘pi bilan 72 belgidan iborat bo‘lishi kerak')
    .refine(
      (value) => /\p{L}/u.test(value) && /\p{N}/u.test(value),
      'Parolda kamida bitta harf va bitta raqam bo‘lishi kerak'
    ),
});

type FormData = z.infer<typeof formSchema>;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function useCheckUser(login: string) {
  const debouncedLogin = useDebounce(login.trim(), 500);
  return useQuery({
    queryKey: ['check-login-sa', debouncedLogin],
    queryFn: async () => {
      if (!debouncedLogin || debouncedLogin.length < 3) {
        return { exists: false };
      }
      const res = await fetch(
        `/api/auth/check-user?login=${encodeURIComponent(debouncedLogin)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return { exists: false };
      return (await res.json()) as { exists?: boolean };
    },
    enabled: !!debouncedLogin && debouncedLogin.length >= 3,
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\p{N}/u.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

export default function SuperAdminRegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [setup, setSetup] = useState<{
    hasSuperAdmin: boolean;
    bootstrapConfigured: boolean;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { fName: '', name: '', sName: '', login: '', password: '' },
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/superadmin/setup-status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setSetup({
            hasSuperAdmin: Boolean(data?.hasSuperAdmin),
            bootstrapConfigured: Boolean(data?.bootstrapConfigured),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSetup({ hasSuperAdmin: false, bootstrapConfigured: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginValue = form.watch('login') || '';
  const passwordValue = form.watch('password') || '';
  const { data: loginCheck, isLoading, isFetching } = useCheckUser(loginValue);

  const isLoginChecking = isLoading || isFetching;
  const isLoginTaken = Boolean(loginCheck?.exists);
  const strength = passwordStrength(passwordValue);

  const onSubmit = async (values: FormData) => {
    try {
      const res = await fetch('/api/superadmin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, bootstrapKey }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
        autoLogin?: boolean;
      };

      if (!res.ok) {
        if (data.code === 'SUPERADMIN_EXISTS') {
          setSetup((prev) => ({
            hasSuperAdmin: true,
            bootstrapConfigured: prev?.bootstrapConfigured ?? true,
          }));
        }
        toast.error(data.message || 'Ro‘yxatdan o‘tishda xatolik');
        return;
      }

      toast.success(data.message || 'SuperAdmin yaratildi');
      // To‘liq qayta yuklash — yangi cookie bilan panelga o‘tish
      window.location.replace(
        data.autoLogin === false ? '/superadmin/login' : '/superadmin/panel'
      );
    } catch {
      toast.error('Server bilan aloqa yo‘q');
    }
  };

  const canSubmit =
    !form.formState.isSubmitting &&
    !isLoginChecking &&
    !isLoginTaken &&
    bootstrapKey.trim().length > 0 &&
    setup?.bootstrapConfigured === true;

  if (!setup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Loader2 className="size-6 animate-spin text-[#102c50]" />
      </div>
    );
  }

  if (setup.hasSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[#102c50]">
            <Shield className="size-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            SuperAdmin allaqachon yaratilgan
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tizimda faqat bitta SuperAdmin bo‘ladi. Hisobingizga kirish uchun
            kirish sahifasidan foydalaning.
          </p>
          <Button
            asChild
            className="mt-6 w-full bg-[#102c50] hover:bg-[#173c68]">
            <Link href="/superadmin/login">Kirish sahifasiga</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 py-10">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#102c50]">
            <Shield className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              SuperAdmin yaratish
            </h1>
            <p className="text-xs text-slate-500">
              Tizimda faqat bitta SuperAdmin bo‘ladi
            </p>
          </div>
        </div>

        {!setup.bootstrapConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Serverda <code className="font-mono">SUPERADMIN_BOOTSTRAP_KEY</code>{' '}
            (kamida 16 belgi) sozlanmagan. Ro‘yxatdan o‘tish uchun uni{' '}
            <code className="font-mono">.env</code> fayliga qo‘shib, serverni
            qayta ishga tushiring.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="fName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familiya</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="family-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ism</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="given-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Otasining ismi</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="additional-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        autoComplete="username"
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/\s/g, ''))
                        }
                      />
                    </FormControl>
                    <div className="min-h-5 text-xs">
                      {isLoginChecking ? (
                        <span className="text-slate-400">Tekshirilmoqda...</span>
                      ) : loginValue.trim().length < 3 ? (
                        <span className="text-amber-600">Kamida 3 belgi</span>
                      ) : isLoginTaken ? (
                        <span className="text-red-600">Login band</span>
                      ) : (
                        <span className="text-emerald-600">Mumkin ✓</span>
                      )}
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
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword
                            ? 'Parolni yashirish'
                            : 'Parolni ko‘rsatish'
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800">
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
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

            <div className="space-y-1">
              <label
                htmlFor="sa-bootstrap-key"
                className="text-sm font-medium text-slate-800">
                Bootstrap kalit
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#102c50]" />
                <Input
                  id="sa-bootstrap-key"
                  className="pl-10"
                  type="password"
                  autoComplete="off"
                  placeholder="SUPERADMIN_BOOTSTRAP_KEY qiymati"
                  value={bootstrapKey}
                  onChange={(e) => setBootstrapKey(e.target.value)}
                  disabled={!setup.bootstrapConfigured}
                />
              </div>
              <p className="text-xs text-slate-500">
                Kalit serverdagi{' '}
                <code className="font-mono">SUPERADMIN_BOOTSTRAP_KEY</code> bilan
                bir xil bo‘lishi kerak. Keyinchalik bu kalit o‘rnini ERI
                (kalitli imzo) egallaydi.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#102c50] hover:bg-[#173c68]">
              {form.formState.isSubmitting
                ? 'Yaratilmoqda...'
                : 'SuperAdmin yaratish'}
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Hisob mavjudmi?{' '}
          <Link
            href="/superadmin/login"
            className="text-[#102c50] hover:underline">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
