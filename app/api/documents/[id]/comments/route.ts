// app/api/documents/[id]/comments
import {NextRequest, NextResponse} from 'next/server';
import {DocumentModel} from '@/models/DocumentModal';
import connectToDatabase from "@/lib/mongodb";
import {getUserId} from "@/lib/userid";
import User from "@/models/User"
import mongoose from "mongoose";

// POST /api/documents/[id]/bac-doc
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
        const document = await DocumentModel.findOne({owner: user._id})
        if(!document) {
            return NextResponse.json({ message: "Hujjat mavjud emas!" }, { status: 400 });
        }
        // forwardedComment

        return NextResponse.json(
            {
                message: "Comment muvaffaqiyatli qo‘shildi",
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