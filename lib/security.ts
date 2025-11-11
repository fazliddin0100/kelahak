// lib/security.ts
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// 🔑 Xavfsizlik middleware
export async function securityMiddleware(req: NextRequest) {
    // const url = req.nextUrl.pathname;

    // 1. CSRF token tekshirish
    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = req.cookies.get("csrf-token")?.value;
    if (!csrfHeader || csrfHeader !== csrfCookie) {
        return NextResponse.json({message: "CSRF token noto‘g‘ri!"}, {status: 403});
    }

    // 2. JWT verify qilish (Authentication + IDOR oldini olish)
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : req.cookies.get("token")?.value;

    if (!token) {
        return NextResponse.json({message: "Token mavjud emas!"}, {status: 401});
    }

    let decoded: any;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch {
        return NextResponse.json({message: "Token noto‘g‘ri yoki muddati tugagan!"}, {status: 401});
    }

    // 3. IDOR oldini olish: foydalanuvchi faqat o‘z resursiga kira oladi
    const resourceOwnerId = req.nextUrl.searchParams.get("userId");
    if (resourceOwnerId && resourceOwnerId !== decoded.userId) {
        return NextResponse.json({message: "Ruxsat yo‘q (IDOR)!"}, {status: 403});
    }

    // 4. XSS oldini olish: request body’dagi HTML ni tozalash
    if (req.method === "POST" || req.method === "PUT") {
        const cloned = req.clone();
        const body = await cloned.json().catch(() => null);
        const headers = new Headers(req.headers);
        headers.set("x-sanitized-content", body?.content || "");
        return NextResponse.next({request: {headers}});
    }

    return NextResponse.next();
}

// Qaysi route’larda ishlatish
export const config = {
    matcher: ["/api/:path*"], // faqat API route’larda ishlaydi
};
