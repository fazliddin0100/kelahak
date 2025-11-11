// app/api/something/route.ts
import {NextRequest, NextResponse} from "next/server";
import {decodeToken} from "@/lib/jwt";
import User from "@/models/User";
import Personal from '@/models/Personal'

export async function GET(req: NextRequest) {
    try {
        // ✅ Cookie-dan token olish
        const token = req.cookies.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                {error: "Token topilmadi"},
                {status: 401}
            );
        }

        // ✅ Tokenni tekshirish
        const decoded: any = decodeToken(token);

        if (!decoded || !decoded.userId) {
            return NextResponse.json(
                {error: "Token yaroqsiz"},
                {status: 403}
            );
        }

        // ✅ Userni bazadan olish
        const user = await User.findById(decoded.userId);

        if (!user) {
            return NextResponse.json(
                {error: "Foydalanuvchi topilmadi"},
                {status: 404}
            );
        }

        // find person
        const person = await Personal.findById(user.personal)

        return NextResponse.json(
            {person},
            {status: 200}
        );
    } catch (err) {
        console.log(err);
        return NextResponse.json(
            {error: "Tokenni tekshirishda xato"},
            {status: 500}
        );
    }
}
