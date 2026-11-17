// lib/api.ts
export const api = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');

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
    credentials: 'include',
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
