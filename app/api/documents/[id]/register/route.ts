// app/api/documents/[id]/register/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {DocumentStatus} from '@/types/document-status.enum';
import {DocumentModel} from '@/models/DocumentModal';
import {getRegistrationIndex} from "@/utils/registrationIndex"
import connectToDatabase from "@/lib/mongodb";
import {getUserId} from "@/lib/userid";
import User from "@/models/User"
import Role from "@/models/Role";
import Job from "@/models/Job";
import Personal from "@/models/Personal";
import mongoose from "mongoose";

// POST /api/documents/[id]/register
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectToDatabase();

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Noto‘g‘ri ID" }, { status: 400 });
        }
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json({ message: "Foydalanuvchi yo‘q" }, { status: 401 });
        }

        // userni topish
        const user = await User.findById(userId);
        if(!user) {
            return NextResponse.json({ message: "Foydalanuvchi mavjud emas" }, { status: 400 });
        }
        // person aniqlash
        const person = await Personal.findById(user.personal)
        if(!person) {
            return NextResponse.json({ message: "Foydalanuvchi ma`lumotlari mavjud emas!" }, { status: 400 });
        }
        // job aniqlash
        const job = await Job.findById(user.job)
        if(!job) {
            return NextResponse.json({ message: "Foydalanuvchi ma`lumotlari mavjud emas!" }, { status: 400 });
        }
        // roleni olish
        const role = await Role.findById(job.role)
        if(!role && role.permission !== 'register_document') {
            return NextResponse.json({ message: "Foydalanuvchi roli mavjud emas!" }, { status: 400 });
        }
        // find user document
        const document = await DocumentModel.findOne({owner: user._id})
        if(!document) {
            return NextResponse.json({ message: "Hujjat mavjud emas!" }, { status: 400 });
        }
        // hujjatni royxatga olishdan oldin tekshirish
        if(document.status === DocumentStatus.REGISTERED) {
            return NextResponse.json({ message: "Hujjat ro'yxatga olingan!" }, { status: 400 });
        }
        // register document
        if (document.ownerRegion !== person.province) {
            return NextResponse.json({ message: "Hujjat bu viloyatga tegishli emas!" }, { status: 400 });
        }
        //create data
        const year = new Date().getFullYear();
        document.registrationIndex = await getRegistrationIndex(
            person.province,
            year,
            document._id
        );
        document.status = DocumentStatus.REGISTERED;
        document.allowedUsers = [document.owner];
        document.updatedAt = new Date();
        document.sharedWithAdmin = false;
        await document.save();

        return NextResponse.json(
            {
                message: "Hujjat muvaffaqiyatli ro‘yxatga olindi",
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Xatolik:', error);
        return NextResponse.json(
            { message: 'Ichki server xatosi', error: error.message },
            { status: 500 }
        );
    }
}