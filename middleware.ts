// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decodeToken } from "@/lib/jwt";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ✅ LOGIN SAHIFASI OCHIQ
    if (pathname.startsWith("/sign-in")) {
        return NextResponse.next();
    }

    // ✅ LOGIN API OCHIQ
    if (pathname.startsWith("/api/auth/login")) {
        return NextResponse.next();
    }

    // ✅ register SAHIFASI OCHIQ
    if (pathname.startsWith("/sign-up")) {
        return NextResponse.next();
    }

    // ✅ register API OCHIQ
    if (pathname.startsWith("/api/auth/register")) {
        return NextResponse.next();
    }

    // ✅ Token olish
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    const token = bearerToken || request.cookies.get("token")?.value;

    // ✅ TOKEN BO‘LMASA → LOGIN GA YO‘NALTIRILADI
    if (!token) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    try {
        const decoded = decodeToken(token);

        // ✅ Token to‘g‘ri bo‘lsa, userID headerga qo‘shiladi
        const requestHeaders = new Headers(request.headers);
        if (decoded.userId) requestHeaders.set("x-user-id", decoded.userId);

        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    } catch (err) {
        console.error("Token decode error:", err);
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }
}

export const config = {
    matcher: [
        "/api/:path*",
        "/kotibiyat/:path*",
        "/admin/:path*",
        "/user/:path*",
        "/documents/:path*",
        "/document-open/:path*",
        "/document/:path*",
        "/admin/:path*",
        // "/(.*)",
    ],
};
