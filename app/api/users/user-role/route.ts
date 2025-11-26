// app/api/users/user-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/userid';
import User from '@/models/User';
import Job from '@/models/Job';
import Role from '@/models/Role';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);

    // Foydalanuvchini bazadan olish
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // Jobni olish
    const job = await Job.findById(user.job);
    if (!job) {
      return NextResponse.json(
        { error: "Shaxsga doir ma'lumot topilmadi" },
        { status: 404 }
      );
    }

    // user roleni aniqlaymiz
    const role = await Role.findById(job.role);
    if (!role) {
      return NextResponse.json(
        { error: "Shaxsga doir ma'lumot topilmadi" },
        { status: 404 }
      );
    }

    return NextResponse.json({ role: role.role }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 }
    );
  }
}
