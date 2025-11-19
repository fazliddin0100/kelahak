// lib/api.ts
export const api = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});

  // 1. localStorage dan CSRF token olish
  let csrfToken: string | null = null;
  if (typeof window !== 'undefined') {
    csrfToken = localStorage.getItem('csrf-token');
  }

  // 2. Cookie dan JWT/access token olish
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const jwtToken =
    getCookie('access_token') ||
    getCookie('token') ||
    getCookie('auth_token') ||
    getCookie('jwt') ||
    getCookie('sessionid') ||
    null;

  // 3. Headerlarga qo‘shish
  headers.set('Content-Type', 'application/json');

  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  if (jwtToken) {
    headers.set('Authorization', `Bearer ${jwtToken}`);
  }

  // 4. Agar body string bo‘lmasa → JSON qilish
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  // 5. Final fetch
  const response = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: 'include', // cookie lar yuborilsin va qabul qilinsin
  });

  // Xatolik bo‘lsa aniqroq ko‘rsatish uchun
  if (!response.ok) {
    let errorMessage = `HTTP xato: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response;
};
