'use client';

import axios from 'axios';
import { motion } from 'framer-motion';
import { CircleUser, LogOut, ShieldUser } from 'lucide-react';
import LoadingState from '@/components/LoadingState';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface UserData {
  name: string;
  fName: string;
  sName: string;
  province: string;
  isUserTrue?: boolean;
  role?: string;
}

export default function UserProfile() {
  const [data, setData] = useState<UserData | null>(null);

  const router = useRouter();
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/api/something', {
          withCredentials: true,
        });
        setData(res.data.person);
      } catch {
        router.push('/sign-in');
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout', {}, { withCredentials: true });
      localStorage.removeItem('token');
      localStorage.removeItem('csrf-token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('csrf-token');
      router.push('/sign-in');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!data) {
    return <LoadingState compact message="Profil yuklanmoqda..." className="p-2" />;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <div className="relative">
          <Avatar className="w-10 h-10 cursor-pointer shadow border">
            <AvatarFallback className="bg-gray-200 text-black font-semibold">
              <CircleUser />
            </AvatarFallback>
          </Avatar>

          {data.isUserTrue && (
            <div className="absolute -bottom-1 -right-1">
              <div className="logo-online">
                <div className="logo-icon">
                  <div className="live-effect" />
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-60 mt-4 mr-2 p-3 rounded-xl shadow-lg">
        <div className="flex flex-col">
          <p className="font-semibold text-black text-sm leading-tight">
            {data.fName} {data.name} {data.sName}
            <br />
            <span className="text-gray-500 text-xs">{data.province}</span>
          </p>

          <Separator className="my-3" />
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, rotate: 1 }}
            onClick={() => router.push('/admin')}
            className="flex flex-row items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer select-none p-2 rounded-2xl shadow-sm hover:shadow-md transition">
            <ShieldUser className="size-6" />
            Admin panel
          </motion.div>
          <Separator className="my-3" />

          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer transition">
            <LogOut
              size={16}
              className="transform transition-transform duration-200 group-hover:translate-x-1"
            />
            Chiqish
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
