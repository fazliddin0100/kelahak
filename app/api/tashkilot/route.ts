// app/api/tashkilot/route.ts
import {NextRequest, NextResponse} from "next/server";
import User from "@/models/User";
import Job from '@/models/Job'
import {getUserId} from "@/lib/userid";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
     await connectToDatabase();
    try {
        const userId = getUserId(request);
        // Userni bazadan olish
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                {error: "Foydalanuvchi topilmadi"},
                {status: 404}
            );
        }

        // find organ
        const
            job = await Job.findById(user.job)
        if (!job) {
            return NextResponse.json(
                {error: "Job topilmadi"},
                {status: 404}
            );
        }

        return NextResponse.json(
            {organ: job.organ},
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
