// lib/api.ts yoki lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Har bir so‘rov oldidan cookie'dan tokenni o‘qib, headerga qo‘shish
api.interceptors.request.use((config) => {
  // Browserda cookie'dan token olish (server-side bo‘lsa boshqacha bo‘ladi)
  const token =
    getCookie('access_token') || getCookie('token') || getCookie('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Cookie o‘qish funksiyasi
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // SSR uchun
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default api;
