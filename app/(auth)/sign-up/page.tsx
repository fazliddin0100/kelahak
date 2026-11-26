// app/register/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/sonner';
import { getAgentInfo, type AgentInfo } from '@/lib/eimzo/agentClient';

import mexonLogo from '../../../public/mexon-mark.png';

// ────────────────────────────────────────────────
// Debounce hook (o'z ichida yozilgan – qo'shimcha paket kerak emas)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ────────────────────────────────────────────────
const provinces = [
  'Andijon',
  'Buxoro',
  'Farg‘ona',
  'Jizzax',
  'Qashqadaryo',
  'Qoraqalpog‘iston',
  'Navoiy',
  'Namangan',
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
  'Toshkent',
  'Toshkent viloyati',
  'Xorazm',
];

const fieldLabels: Record<string, string> = {
  fName: 'Familiya',
  name: 'Ism',
  sName: 'Otasining ismi',
  province: 'Viloyat',
  shahobchaId: 'Shahobcha',
  department: "Bo'lim",
  position: 'Lavozim',
  militaryRank: 'Unvon',
  login: 'Login',
  password: 'Parol',
};

/** Server ham shu chegarani qo'llaydi (api/auth/register: MAX_FIELD_LENGTH) */
const LONG_FIELD_MAX = 150;

const LONG_FIELD_PLACEHOLDERS = {
  department: 'Bo‘lim yoki bo‘linmaning to‘liq nomi',
  position: 'Lavozimning to‘liq nomi',
  militaryRank: 'Unvon',
} as const;

const formSchema = z.object({
  fName: z.string().min(1, 'Familiya majburiy'),
  name: z.string().min(1, 'Ism majburiy'),
  sName: z.string().min(1, 'Otasining ismi majburiy'),
  province: z.string().min(1, 'Viloyat majburiy'),
  shahobchaId: z.string().min(1, 'Shahobchani tanlang'),
  department: z.string().min(1, "Bo'lim majburiy"),
  position: z.string().min(1, 'Lavozim majburiy'),
  militaryRank: z.string().min(1, 'Unvon majburiy'),
  login: z.string().min(3, 'Login kamida 3 belgidan iborat bo‘lishi kerak'),
  password: z
    .string()
    .min(12, 'Parol kamida 12 belgidan iborat bo‘lishi kerak')
    .max(72, 'Parol ko‘pi bilan 72 belgidan iborat bo‘lishi kerak')
    .refine(
      (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
      'Parolda kamida bitta harf va bitta raqam bo‘lishi kerak'
    ),
});

type FormData = z.infer<typeof formSchema>;

// ────────────────────────────────────────────────
const useCheckUser = (login: string) => {
  const debouncedLogin = useDebounce(login.trim(), 500);

  return useQuery({
    queryKey: ['check-login', debouncedLogin],
    queryFn: async () => {
      if (!debouncedLogin || debouncedLogin.length < 3) {
        return { exists: false, message: 'Kam belgi' };
      }

      const res = await fetch(
        `/api/auth/check-user?login=${encodeURIComponent(debouncedLogin)}`
      );

      if (!res.ok) {
        return { exists: false, message: 'Server xatosi' };
      }

      return res.json();
    },
    enabled: !!debouncedLogin && debouncedLogin.length >= 3,
    staleTime: 0,
    gcTime: 1000 * 30, // 30 soniya ichida qayta so‘ramasa cache tozalanadi
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// ────────────────────────────────────────────────
export default function RegistrationPage() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // Ro'yxatdan o'tayotgan kompyuter (Mezon agenti): MAC, disk seriyasi — E-IMZO yaratishda kerak
  const [agent, setAgent] = useState<AgentInfo | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void getAgentInfo().then((info) => active && setAgent(info));
    return () => {
      active = false;
    };
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fName: '',
      name: '',
      sName: '',
      province: '',
      shahobchaId: '',
      department: '',
      position: '',
      militaryRank: '',
      login: '',
      password: '',
    },
  });

  const loginValue = form.watch('login') || '';
  const { data: loginCheck, isLoading, isFetching } = useCheckUser(loginValue);

  const passwordValue = form.watch('password') || '';

  const provinceValue = form.watch('province') || '';
  const { data: shahobchalar = [], isFetching: shahobchaLoading } = useQuery({
    queryKey: ['shahobchalar', provinceValue],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const res = await fetch(`/api/shahobcha?province=${encodeURIComponent(provinceValue)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.shahobchalar ?? [];
    },
    enabled: !!provinceValue,
    staleTime: 60_000,
  });

  // Viloyat o'zgarsa, oldingi shahobcha tanlovi bekor qilinadi
  useEffect(() => {
    form.setValue('shahobchaId', '');
  }, [provinceValue, form]);

  // Parol kuchliligi (0-3)
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 3);
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (values: FormData) => {
    if (loginCheck?.exists) {
      toast.error('Bu login allaqachon band');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, device: (await getAgentInfo()) ?? agent ?? undefined }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Muvaffaqiyatli ro‘yxatdan o‘tildi!');
        form.reset();
        router.push('/sign-in');
      } else {
        toast.error(data.message || 'Xatolik yuz berdi');
      }
    } catch {
      toast.error('Server bilan bog‘lanishda xatolik');
    }
  };

  const isLoginChecking = isLoading || isFetching;
  const isLoginTaken = !!loginCheck?.exists;
  const canSubmit =
    !form.formState.isSubmitting && !isLoginChecking && !isLoginTaken;

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-gray-100">
        <div className="mx-auto mb-6 flex h-20 w-24 items-center justify-center rounded-xl bg-brand-ink p-2 shadow-md">
          <Image
            src={mexonLogo}
            alt="Mezon"
            width={512}
            height={324}
            className="h-14 w-[5.5rem] object-contain"
          />
        </div>

        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Ro‘yxatdan o‘tish
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Familiya, Ism, Otasining ismi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {['fName', 'name', 'sName'].map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field as keyof FormData}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{fieldLabels[field]}</FormLabel>
                      <FormControl>
                        <Input {...f} placeholder={fieldLabels[field]} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* Viloyat + Shahobcha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                            className="w-full justify-between text-left">
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
                            className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2">
                            {provinces.map((p) => (
                              <div
                                key={p}
                                className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded cursor-pointer">
                                <RadioGroupItem value={p} id={p} />
                                <label
                                  htmlFor={p}
                                  className="cursor-pointer flex-1">
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

              <FormField
                control={form.control}
                name="shahobchaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shahobcha</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        disabled={!provinceValue || shahobchaLoading}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60">
                        <option value="">
                          {!provinceValue ? 'Avval viloyatni tanlang'
                          : shahobchaLoading ? 'Yuklanmoqda...'
                          : shahobchalar.length === 0 ? 'Bu viloyatda shahobcha yo‘q'
                          : 'Shahobchani tanlang'}
                        </option>
                        {shahobchalar.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    {provinceValue && !shahobchaLoading && shahobchalar.length === 0 && (
                      <p className="text-xs text-amber-700">
                        Ushbu viloyatda shahobcha yo‘q.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Bo'lim, Lavozim, Unvon — uzun nomlar uchun o'zi kengayadigan maydonlar */}
            <div className="grid grid-cols-1 gap-5">
              {(['department', 'position', 'militaryRank'] as const).map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field}
                  render={({ field: f }) => (
                    <FormItem>
                      <div className="flex items-baseline justify-between gap-2">
                        <FormLabel>{fieldLabels[field]}</FormLabel>
                        <span className="text-xs text-gray-400" aria-hidden="true">
                          {(f.value ?? '').length}/{LONG_FIELD_MAX}
                        </span>
                      </div>
                      <FormControl>
                        <Textarea
                          {...f}
                          rows={1}
                          maxLength={LONG_FIELD_MAX}
                          placeholder={LONG_FIELD_PLACEHOLDERS[field]}
                          className="min-h-9 resize-none leading-6"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                          }}
                          onChange={(e) =>
                            f.onChange(e.target.value.replace(/\s*\n\s*/g, ' '))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* Login + Parol */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Login */}
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-1.5">
                    <FormLabel>Login</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Masalan: aliyev_a"
                        autoComplete="off"
                        onChange={(e) => field.onChange(e.target.value.trim())}
                      />
                    </FormControl>
                    <div className="min-h-6 text-xs">
                      {isLoginChecking ?
                        <span className="text-gray-500">
                          Tekshirilmoqda...
                        </span>
                      : loginValue.length === 0 ?
                        <span className="text-gray-500">Kamida 3 belgi, bo‘sh joysiz</span>
                      : loginValue.length < 3 ?
                        <span className="text-amber-600">
                          Kamida 3 belgi bo‘lishi kerak
                        </span>
                      : isLoginTaken ?
                        <span className="text-red-600 font-medium">
                          Bu login band
                        </span>
                      : <span className="text-green-600 font-medium">
                          Foydalanish mumkin ✓
                        </span>
                      }
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parol */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-1.5">
                    <FormLabel>Parol</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Parol kiriting"
                        autoComplete="new-password"
                      />
                    </FormControl>

                    {passwordValue && (
                      <div className="space-y-1.5 mt-1">
                        <div className="flex gap-1.5">
                          {[1, 2, 3].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                strength >= level ?
                                  strength === 1 ? 'bg-red-400'
                                  : strength === 2 ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                                : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide">
                          {strength === 0 && (
                            <span className="text-gray-500">Juda zaif</span>
                          )}
                          {strength === 1 && (
                            <span className="text-red-600">Zaif</span>
                          )}
                          {strength === 2 && (
                            <span className="text-amber-600">O‘rta</span>
                          )}
                          {strength === 3 && (
                            <span className="text-emerald-600">Kuchli</span>
                          )}
                        </p>
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Kompyuter (Mezon agenti) holati */}
            <p
              className={
                agent ?
                  'mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200'
                : 'mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200'
              }
              aria-live="polite">
              {agent === undefined ?
                'Kompyuter tekshirilmoqda...'
              : agent ?
                <>
                  Kompyuter: <b>{agent.hostname}</b> · MAC <span className="font-mono">{agent.mac}</span> — hisobingizga
                  biriktiriladi.
                </>
              : 'Kompyuterda «Mezon agenti» topilmadi: kompyuter ma’lumoti yozilmaydi. E-IMZO olish uchun administrator agentni o‘rnatadi.'}
            </p>

            {/* Submit tugmasi */}
            <Button
              type="submit"
              className="mt-4 h-12 w-full bg-primary text-base font-medium text-white transition-colors duration-150 hover:bg-primary-hover"
              disabled={!canSubmit}>
              {form.formState.isSubmitting ?
                'Ro‘yxatdan o‘tkazilmoqda...'
              : isLoginTaken ?
                'Login band – boshqa tanlang'
              : isLoginChecking ?
                'Tekshirilmoqda...'
              : 'Ro‘yxatdan o‘tish'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
