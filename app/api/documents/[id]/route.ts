// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { DocumentModel } from '@/models/DocumentModal';
import mongoose from 'mongoose';
import { sanitizeHTML } from '@/lib/purify';
import { getUserId } from '@/lib/userid';
import User from '@/models/User';
import Role from '@/models/Role';
import Job from '@/models/Job';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // userni olish
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }
    // find jon and jon is role
    const job = await Job.findById(user.job);
    const role = await Role.findById(job?.role);

    // MUHIM: owner ni populate qilish
    const document = await DocumentModel.findById(id).populate('owner').exec();

    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    // owner._id ni olish
    const ownerId = document.owner?._id?.toString();
    const isOwner = ownerId === userId;
    const isAllowed = document.allowedUsers?.some(
      (u: { toString: () => string }) => u.toString() === userId
    );

    // if (!isOwner && !isAllowed) {
    //   return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    // }

    // Body
    const body = await request.json();

    // Update fields
    document.content =
      typeof body.content === 'string'
        ? sanitizeHTML(body.content)
        : body.content;
    document.grif = body.grif || '';
    document.copyNumber = Array.isArray(body.copyNumber) ? body.copyNumber : [];
    document.title = body.title || document.title;

    // Signer info
    if (
      body.signerInfo?.userId &&
      mongoose.Types.ObjectId.isValid(body.signerInfo.userId)
    ) {
      document.bosSigned = {
        userId: body.signerInfo.userId,
        fullName: body.signerInfo.fullName,
        militaryRank: body.signerInfo.militaryRank || '',
        position: body.signerInfo.position || '',
        hasSigned: body.signerInfo.hasSigned || false,
        signedAt: body.signerInfo.signedAt || undefined,
      };
    }

    // Approvers
    if (Array.isArray(body.signerInfo?.approvers)) {
      document.approvers = body.signerInfo.approvers
        .filter(
          (a: {
            userId:
              | string
              | number
              | mongoose.mongo.BSON.ObjectId
              | mongoose.mongo.BSON.ObjectIdLike
              | Uint8Array<ArrayBufferLike>;
          }) => a.userId && mongoose.Types.ObjectId.isValid(a.userId)
        )
        .map(
          (a: {
            userId: any;
            fullName: any;
            militaryRank: any;
            position: any;
            hasSigned: any;
            signedAt: any;
          }) => ({
            userId: a.userId,
            fullName: a.fullName,
            militaryRank: a.militaryRank || '',
            position: a.position || '',
            hasSigned: a.hasSigned || false,
            signedAt: a.signedAt || undefined,
          })
        );
    }

    // Sender & Receiver
    if (
      body.sender?.userId &&
      mongoose.Types.ObjectId.isValid(body.sender.userId)
    ) {
      document.sender = {
        userId: body.sender.userId,
        fullName: body.sender.fullName,
        militaryRank: body.sender.militaryRank || '',
        position: body.sender.position || '',
        hasSigned: body.sender.hasSigned || false,
      };
    }

    if (Array.isArray(body.receiver)) {
      document.receiver = body.receiver
        .filter(
          (r: {
            userId:
              | string
              | number
              | mongoose.mongo.BSON.ObjectId
              | mongoose.mongo.BSON.ObjectIdLike
              | Uint8Array<ArrayBufferLike>;
          }) => r.userId && mongoose.Types.ObjectId.isValid(r.userId)
        )
        .map(
          (r: {
            userId: any;
            fullName: any;
            militaryRank: any;
            position: any;
          }) => ({
            userId: r.userId,
            fullName: r.fullName,
            militaryRank: r.militaryRank || '',
            position: r.position || '',
          })
        );
    }

    // Author
    if (
      body.author?.userId &&
      mongoose.Types.ObjectId.isValid(body.author.userId)
    ) {
      document.author = {
        userId: body.author.userId,
        fullName: body.author.fullName,
        militaryRank: body.author.militaryRank || '',
        position: body.author.position || '',
        hasSigned: body.author.hasSigned || false,
      };
    }

    document.updatedAt = new Date();
    await document.save();

    return NextResponse.json(
      {
        message: "Hujjat o'zgartirildi",
        user: role.role,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Xato:', error);
    return NextResponse.json(
      { message: 'Xatolik', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Hujjatni olish (ruxsat tekshiruvi yo‘q)
    const populatedDoc = await DocumentModel.findById(id)
      .populate('owner', 'fullName militaryRank position')
      .populate('author.userId', 'fullName militaryRank position')
      .populate('sender.userId', 'fullName militaryRank position')
      .populate('receiver.userId', 'fullName militaryRank position')
      .populate('bosSigned.userId', 'fullName militaryRank position')
      .populate({
        path: 'approvers.userId',
        select: 'fullName militaryRank position',
      })
      .lean();

    if (!populatedDoc) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json(populatedDoc, { status: 200 });
  } catch (error: any) {
    console.error('Hujjatni olishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjatni olishda xatolik', error: error.message },
      { status: 500 }
    );
  }
}
