'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import validator from 'validator';
import { motion } from 'framer-motion';
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
import { toast } from '@/components/ui/sonner';
import mexonLogo from '@/public/mexon-mark.png';
import { decodeToken } from '@/lib/jwt';
import { PENDING_ACCESS_MESSAGE } from '@/lib/authConstants';

const formSchema = z.object({
  login: z.string().min(1, 'Username majburiy'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
});

export default function Login() {
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const router = useRouter();

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

      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('ref_token', data.ref_token);
        // eslint-disable-next-line react-hooks/immutability
        document.cookie = `ref_token=${data.ref_token}; path=/; SameSite=Lax;`;
        if (data.token) {
          localStorage.setItem('sa_token', data.token);
          localStorage.setItem('token', data.token);
        }
        toast.success('Xush kelibsiz!');
        const decode = decodeToken(data.ref_token);
        if (data.role === 'superAdmin') {
          setTimeout(() => router.push('/superadmin/panel'), 200);
        } else if (
          data.role === 'admin' ||
          decode.department === 'kotibiyat'
        ) {
          setTimeout(() => router.push('/admin/navbar'), 200);
        } else {
          setTimeout(() => router.push('/sign-in'), 200);
        }
      } else {
        const errorMsg =
          data.code === 'PENDING_APPROVAL' ?
            data.message || PENDING_ACCESS_MESSAGE
          : data.message || 'Xatolik yuz berdi';
        setResponseMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch {
      toast.error('Server bilan bog‘liq xatolik yuz berdi');
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md p-8 mx-auto rounded-2xl shadow-xl bg-white/90 backdrop-blur-sm border border-gray-200">
        {/* Logo */}
        <div className="w-24 h-20 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-[#0b1524] p-2 shadow-md">
          <Image
            src={mexonLogo}
            alt="Mezon"
            width={512}
            height={324}
            className="h-14 w-[5.5rem] object-contain"
          />
        </div>

        {/* Sarlavha */}
        <motion.h2
          className="text-3xl font-bold text-center mb-8
                 bg-linear-to-r from-purple-500 via-pink-500 to-orange-500
                 bg-clip-text text-transparent animate-gradient"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}>
          Tizimga kirish
        </motion.h2>

        {/* Xato/Xabar */}
        {responseMessage && (
          <p
            className={`text-center mb-6 p-3 rounded-lg text-sm font-medium transition-all ${
              responseMessage.includes('Muvaffaqiyatli')
                ? 'bg-green-50 text-green-700 border border-green-200'
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
                      className="h-12 text-base border-gray-300 focus:border-[#c7a75b] focus:ring-[#c7a75b]"
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
                      className="h-12 text-base border-gray-300 focus:border-[#c7a75b] focus:ring-[#c7a75b]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold bg-[#102c50] hover:bg-[#173c68] text-white shadow-sm transition-colors duration-150">
              Kirish
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
