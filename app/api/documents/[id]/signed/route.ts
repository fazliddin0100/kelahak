// app/api/documents/[id]/signed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DocumentStatus } from '@/types/document-status.enum';
import { DocumentModel } from '@/models/DocumentModal';
import connectToDatabase from '@/lib/mongodb';
import { getUserId } from '@/lib/userid';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Noto‘g‘ri ID' }, { status: 400 });
    }

    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: 'Foydalanuvchi yo‘q' },
        { status: 401 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi mavjud emas' },
        { status: 400 }
      );
    }

    // hujjatni ID bo‘yicha topamiz
    const document = await DocumentModel.findById(id);
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat mavjud emas!' },
        { status: 404 }
      );
    }

    // agar allaqachon imzolangan bo‘lsa
    if (document.status === DocumentStatus.SIGNED) {
      return NextResponse.json(
        { message: 'Hujjat allaqachon imzolangan!' },
        { status: 400 }
      );
    }

    // 🔥 user qayerda bo‘lsa o‘sha joyni imzolash
    if (document.author?.userId?.toString() === user._id.toString()) {
      document.author.hasSigned = true;
    }
    if (document.sender?.userId?.toString() === user._id.toString()) {
      document.sender.hasSigned = true;
    }
    if (document.bosSigned?.userId?.toString() === user._id.toString()) {
      document.bosSigned.hasSigned = true;
    }

    if (Array.isArray(document.approvers)) {
      document.approvers = document.approvers.map((ap: any) =>
        ap.userId?.toString() === user._id.toString()
          ? { ...ap, hasSigned: true }
          : ap
      );
    }

    if (Array.isArray(document.receiver)) {
      document.receiver = document.receiver.map((rc: any) =>
        rc.userId?.toString() === user._id.toString()
          ? { ...rc, hasSigned: true }
          : rc
      );
    }

    if (Array.isArray(document.forwardedTo)) {
      document.forwardedTo = document.forwardedTo.map((fw: any) =>
        fw.userId?.toString() === user._id.toString()
          ? { ...fw, hasSigned: true }
          : fw
      );
    }

    // 🔥 endi hamma imzolaganini tekshiramiz
    const everyoneSigned =
      (document.author ? document.author.hasSigned : true) &&
      (document.sender ? document.sender.hasSigned : true) &&
      (document.bosSigned ? document.bosSigned.hasSigned : true) &&
      document.approvers.every((ap: any) => ap.hasSigned) &&
      document.receiver.every((rc: any) => rc.hasSigned) &&
      document.forwardedTo.every((fw: any) => fw.hasSigned);

    if (everyoneSigned) {
      document.status = DocumentStatus.SIGNED;
      document.allowedUsers = [document.owner];
    }

    await document.save();

    return NextResponse.json(
      {
        message: everyoneSigned ? 'Hujjat to‘liq imzolandi' : 'Imzo qo‘yildi',
        status: document.status,
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
