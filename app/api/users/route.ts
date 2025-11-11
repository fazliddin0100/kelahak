// app/api/users/route.ts
import {NextRequest, NextResponse} from "next/server";
import User from "@/models/User";
import {getUserId} from "@/lib/userid";
import Personal from "@/models/Personal";

export async function GET(request: NextRequest) {
    try {
        const userId = getUserId(request);

        // Foydalanuvchini bazadan olish
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                {error: "Foydalanuvchi topilmadi"},
                {status: 404}
            );
        }

        // Personalni olish
        const person = await Personal.findById(user.personal);
        if (!person) {
            return NextResponse.json(
                {error: "Personal topilmadi"},
                {status: 404}
            );
        }

        // Shu province ga tegishli barcha Personal hujjatlarini olish
        const personsInSameProvince = await Personal.find({province: person.province});

        // Shu Personallarga tegishli barcha foydalanuvchilarni olish
        // job va personal maydonlarini to'liq obyekt sifatida populate qilamiz
        const usersInSameProvince = await User.find({
            personal: {$in: personsInSameProvince.map(p => p._id)}
        }).populate('job').populate('personal');

        // Natijani tuzish: userId, personal, job
        const result = usersInSameProvince.map(u => ({
            userId: u._id,
            personal: u.personal,
            job: u.job
        }));

        return NextResponse.json(
            {users: result},
            {status: 200}
        );

    } catch (err) {
        console.log(err);
        return NextResponse.json(
            {error: "Serverda xatolik yuz berdi!"},
            {status: 500}
        );
    }
}


