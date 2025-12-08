// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/sonner';

import gerb from '../../../public/gerb.png';

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
  login: z.string().min(1, 'Login majburiy'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
});

type FormData = z.infer<typeof formSchema>;

const useCheckUser = (login: string) => {
  return useQuery({
    queryKey: ['checkUser', login],
    queryFn: async () => {
      if (!login) return { exists: false };
      const res = await fetch(
        `/api/auth/check-user?login=${encodeURIComponent(login)}`
      );
      if (!res.ok) return { exists: false };
      return res.json();
    },
    enabled: !!login && login.length >= 1,
    staleTime: 2000,
  });
};

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

  const loginValue = form.watch('login');
  const { data: loginCheck, isLoading: checkingLogin } =
    useCheckUser(loginValue);

  const onSubmit = async (values: FormData) => {
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

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl p-6 shadow-md">
        <div className="w-20 h-20 mx-auto mb-6">
          <Image
            src={gerb}
            alt="DXX Logo"
            width={120}
            height={120}
            className="rounded-full object-cover w-20 h-auto"
          />
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center">
          Ro‘yxatdan o‘tish
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 1. Ism */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* 2. Viloyat, Organ, Bo'lim */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldLabels.province}</FormLabel>
                    <FormControl>
                      <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between">
                            {field.value || 'Viloyatni tanlang'}{' '}
                            <span className="ml-2">▼</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                          <DialogHeader>
                            <DialogTitle>Viloyatni tanlang</DialogTitle>
                          </DialogHeader>
                          <RadioGroup
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              setOpen(false);
                            }}
                            className="flex flex-col gap-2 mt-4 max-h-96 overflow-y-auto">
                            {provinces.map((p) => (
                              <div
                                key={p}
                                className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded">
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

            {/* 3. Lavozim va Unvon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* 4. Login va Parol */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['login', 'password'].map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field as keyof FormData}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{fieldLabels[field]}</FormLabel>
                      <FormControl>
                        <Input
                          {...f}
                          type={field === 'password' ? 'password' : 'text'}
                          placeholder={fieldLabels[field]}
                          autoComplete={
                            field === 'password' ? 'new-password' : 'off'
                          }
                        />
                      </FormControl>
                      <FormMessage />
                      {field === 'login' && (
                        <div className="h-5">
                          {checkingLogin ? (
                            <p className="text-xs text-gray-500">
                              Tekshirilmoqda...
                            </p>
                          ) : loginCheck?.exists ? (
                            <p className="text-xs text-red-600">
                              Bu login band
                            </p>
                          ) : loginValue.length > 0 ? (
                            <p className="text-xs text-green-600">
                              Foydalanish mumkin
                            </p>
                          ) : null}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800"
              disabled={
                form.formState.isSubmitting ||
                loginCheck?.exists ||
                checkingLogin
              }>
              {form.formState.isSubmitting
                ? 'Yuborilmoqda...'
                : loginCheck?.exists
                ? 'Login band'
                : 'Ro‘yxatdan o‘tish'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
