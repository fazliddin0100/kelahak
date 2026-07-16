'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const REASON_MESSAGES: Record<string, string> = {
  access_denied: "Sizda bu sahifaga kirish huquqi yo'q.",
  token_expired: 'Sessiya muddati tugadi. Qayta kiring.',
  invalid_token: "Sessiya ma'lumotlari buzilgan.",
  no_role: 'Foydalanuvchi roli aniqlanmadi.',
  unauthorized: 'Ruxsatsiz kirish urinishi.',
};

const COUNTDOWN_START = 3;

export default function ForceLogoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const cleanedRef = useRef(false); 

  // ✅ useState ishlatmasdan, render vaqtida hisoblash
  const reason = searchParams.get('reason') || 'unauthorized';
  const message = REASON_MESSAGES[reason] ?? REASON_MESSAGES.unauthorized;

  useEffect(() => {
    // ✅ Strict Mode da ikki marta ishlamasligi uchun
    if (cleanedRef.current) return;
    cleanedRef.current = true;

    // 1. localStorage va sessionStorage tozalash
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Storage clear error:', e);
    }

    // 2. Client-side cookie'larni o'chirish
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    // 3. IndexedDB tozalash
    try {
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        indexedDB.databases().then((dbs) => {
          dbs.forEach((db) => {
            if (db.name) indexedDB.deleteDatabase(db.name);
          });
        });
      }
    } catch (e) {
      console.error('IndexedDB clear error:', e);
    }

    // 4. Countdown — setCountdown(prev => ...) functional update ishlatilgan, to'g'ri
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace(`/sign-in?reason=${reason}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
        </div>

        {/* Xabar */}
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Kirish rad etildi
          </h1>
          <p className="text-gray-500 mt-2 text-sm">{message}</p>
        </div>

        {/* Countdown */}
        <div className="text-sm text-gray-400">
          <span className="font-medium text-gray-600">{countdown}</span>{' '}
          soniyadan so&apos;ng login sahifasiga yo&apos;naltirilasiz...
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-red-400 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / COUNTDOWN_START) * 100}%` }}
          />
        </div>

        {/* Manual redirect */}
        <button
          onClick={() => router.replace('/sign-in')}
          className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors">
          Hoziroq chiqish
        </button>
      </div>
    </div>
  );
}
