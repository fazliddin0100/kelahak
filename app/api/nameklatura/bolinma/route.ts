// app/api/nameklatura/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Personal from "@/models/Personal";
import Job from "@/models/Job";
import { getUserId } from "@/lib/userid";

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        // 1. Current userni topish
        const userId = getUserId(request);
        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ message: "User topilmadi" }, { status: 404 });

        // 2. current userning province
        const personal = await Personal.findById(user.personal);
        if (!personal)
            return NextResponse.json({ message: "Personal topilmadi" }, { status: 404 });

        const province = personal.province;

        // 3. Shu province’dagi barcha personal
        const personalsInProvince = await Personal.find({ province });
        const personalIds = personalsInProvince.map((p) => p._id);

        // 4. Shu personal ID-larga tegishli userlar
        const usersInProvince = await User.find({ personal: { $in: personalIds } });
        const jobIds = usersInProvince.map((u) => u.job);

        // 5. Ularning Job larini olish
        const jobs = await Job.find({ _id: { $in: jobIds } });

        // 6. departmentlarni olish va duplicates ni olib tashlash
        const departments = [...new Set(jobs.map((j) => j.department))];

        return NextResponse.json(
            {
                province,
                departments,
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ message: "Xatolik", error: error.message }, { status: 500 });
    }
}
