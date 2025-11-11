// lib/api.ts
export const api = async (url: string, options: RequestInit = {}) => {
    const csrfToken = typeof window !== "undefined" ? localStorage.getItem("csrf-token") : null;

    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    if (csrfToken) {
        headers.set("x-csrf-token", csrfToken);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: "include",
    });
};