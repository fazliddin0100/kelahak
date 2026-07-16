import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("token");
    response.cookies.delete("sa_token");
    response.cookies.delete("ref_token");
    response.cookies.delete("csrf-token");

    return response;
}
