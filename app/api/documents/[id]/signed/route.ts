// app/api/documents/[id]/signed/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {DocumentStatus} from '@/types/document-status.enum';
import {DocumentModel} from '@/models/DocumentModal';
import connectToDatabase from "@/lib/mongodb";
import {getUserId} from "@/lib/userid";
import User from "@/models/User"
import mongoose from "mongoose";

// POST /api/documents/[id]/signed
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

        // find user document
        const document = await DocumentModel.findOne({ owner: user._id });
        if (!document) {
            return NextResponse.json({ message: "Hujjat mavjud emas!" }, { status: 400 });
        }

        // tekshiramiz imzolanmaganligini
        if(document.status === DocumentStatus.SIGNED) {
            return NextResponse.json({ message: "Hujjat imzolangan!" }, { status: 400 });
        }

        // 🔥 1. author tekshirish
        if (document.author?.userId?.toString() === user._id.toString()) {
            document.author.hasSigned = true;
        }

        // 🔥 2. sender tekshirish (agar senderda userId bo'lsa)
        if (document.sender?.userId?.toString() === user._id.toString()) {
            document.sender.hasSigned = true;
        }

        // 🔥 3. boshliq (bosSigned) tekshirish
        if (document.bosSigned?.userId?.toString() === user._id.toString()) {
            document.bosSigned.hasSigned = true;
        }

        // 🔥 4. approvers[] ro‘yxati
        if (Array.isArray(document.approvers)) {
            document.approvers = document.approvers.map((ap: { userId: { toString: () => string; }; hasSigned: boolean; }) => {
                if (ap.userId?.toString() === user._id.toString()) {
                    ap.hasSigned = true;
                }
                return ap;
            });
        }

        // 🔥 5. receiver[] ro‘yxati
        if (Array.isArray(document.receiver)) {
            document.receiver = document.receiver.map((rc: { userId: { toString: () => string; }; hasSigned: boolean; }) => {
                if (rc.userId?.toString() === user._id.toString()) {
                    rc.hasSigned = true;
                }
                return rc;
            });
        }

        // 🔥 6. forwardedTo[] ro‘yxati
        if (Array.isArray(document.forwardedTo)) {
            document.forwardedTo = document.forwardedTo.map((fw: { userId: { toString: () => string; }; hasSigned: boolean; }) => {
                if (fw.userId?.toString() === user._id.toString()) {
                    fw.hasSigned = true;
                }
                return fw;
            });
        }

        // document holatini o'zgartirish
        document.status = DocumentStatus.SIGNED;
        document.allowedUsers = [document.owner];

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