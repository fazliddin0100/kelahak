'use client';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import validator from 'validator';
import { PENDING_ACCESS_MESSAGE } from '@/lib/authConstants';
import { getPostLoginPath } from '@/lib/authRedirect';
import * as z from 'zod';

import backgroundImage from '../../../public/basgraund.webp';
import dxxlogo from '../../../public/gerb.png';

const formSchema = z.object({
  login: z.string().min(1, 'Username majburiy'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
});

export default function LoginPage() {
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.search.includes('pending=approval')
    ) {
      setResponseMessage(PENDING_ACCESS_MESSAGE);
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const sanitizedData = {
        login: validator.escape(validator.trim(values.login)),
        password: validator.escape(validator.trim(values.password)),
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        toast.success('Xush kelibsiz!');
        const target = getPostLoginPath(data);
        window.location.replace(target);
        return;
      } else {
        const errorMsg =
          data.code === 'PENDING_APPROVAL' ?
            data.message || PENDING_ACCESS_MESSAGE
          : data.message || 'Xatolik yuz berdi';
        setResponseMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error('Server bilan bog‘liq xatolik yuz berdi');
    }
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-linear-to-br from-gray-50 to-gray-100 p-4"
      style={{ backgroundImage: `url(${backgroundImage.src})` }}>
      <div className="w-full max-w-md p-8 mx-auto rounded-2xl shadow-xl bg-white/90 backdrop-blur-sm border border-gray-200">
        {/* Logo */}
        <div className="w-20 h-25 mx-auto mb-6 rounded-full overflow-hidden">
          <Image
            src={dxxlogo}
            alt="DXX Logo"
            style={{
              width: 100,
              height: 'auto',
            }}
            className="object-cover image_style360"
          />
        </div>

        {/* Sarlavha */}
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Tizimga kirish
        </h2>

        {/* Xato/Xabar */}
        {responseMessage && (
          <p
            className={`text-center mb-6 p-3 rounded-lg text-sm font-medium transition-all ${
              responseMessage.includes('Muvaffaqiyatli') ?
                'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            {responseMessage}
          </p>
        )}

        {/* Forma */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Login</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username kiriting"
                      {...field}
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Parol</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-300">
              Kirish
            </Button>
          </form>
        </Form>

        {/* Zamonaviy "Ro‘yxatdan o‘tish" havolasi */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-3">Hisobingiz yo‘qmi?</p>
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-2 text-base font-medium text-blue-600 hover:text-blue-700 transition-all duration-300">
            <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="relative">
              Ro‘yxatdan o‘tish
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
