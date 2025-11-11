import {NextRequest, NextResponse} from "next/server";
import Auth from "@/models/Auth";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
    const login = request.nextUrl.searchParams.get("login");
    if (!login) return NextResponse.json({exists: false});

    await connectToDatabase();

    const exists = await Auth.findOne({login: login.toLowerCase()});
    return NextResponse.json({exists: !!exists});
}
