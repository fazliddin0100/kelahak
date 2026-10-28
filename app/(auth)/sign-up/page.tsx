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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/sonner';

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
  organ: 'Masul organ',
  department: "Bo'lim",
  position: 'Lavozim',
  militaryRank: 'Unvon',
  login: 'Login',
  password: 'Parol',
};

const formSchema = z.object({
  fName: z.string().min(1, 'Familiya majburiy'),
  name: z.string().min(1, 'Ism majburiy'),
  sName: z.string().min(1, 'Otasining ismi majburiy'),
  province: z.string().min(1, 'Viloyat majburiy'),
  organ: z.string().min(1, 'Masul organ majburiy'),
  department: z.string().min(1, "Bo'lim majburiy"),
  position: z.string().min(1, 'Lavozim majburiy'),
  militaryRank: z.string().min(1, 'Unvon majburiy'),
  login: z.string().min(3, 'Login kamida 3 belgidan iborat bo‘lishi kerak'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fName: '',
      name: '',
      sName: '',
      province: '',
      organ: '',
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
        body: JSON.stringify(values),
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
      <div className="w-full max-w-xl bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
        <div className="mx-auto mb-6 flex h-20 w-24 items-center justify-center rounded-xl bg-[#0b1524] p-2 shadow-md">
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

            {/* Viloyat + Organ + Bo'lim */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

              {['organ', 'department'].map((field) => (
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

            {/* Lavozim + Unvon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {['position', 'militaryRank'].map((field) => (
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
                        placeholder="Login kiriting"
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
                        <span className="text-gray-400">Login kiriting</span>
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

            {/* Submit tugmasi */}
            <Button
              type="submit"
              className="mt-4 h-12 w-full bg-[#102c50] text-base font-medium text-white transition-colors duration-150 hover:bg-[#173c68]"
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
