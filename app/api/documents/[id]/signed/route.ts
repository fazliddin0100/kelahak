// app/api/documents/[id]/signed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DocumentStatus } from '@/types/document-status.enum';
import { DocumentModel } from '@/models/DocumentModal';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Job from '@/models/Job';
import Role from '@/models/Role';
import mongoose from 'mongoose';
import { getUserId } from '@/lib/userid';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await context.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Noto‘g‘ri ID' }, { status: 400 });
        }

        // =============================
        //  USER AUTH (token → userId)
        // =============================
        const userId = getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { message: 'Foydalanuvchi aniqlanmadi' },
                { status: 401 }
            );
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { message: 'Foydalanuvchi topilmadi' },
                { status: 404 }
            );
        }

        const job = await Job.findById(user.job);
        const role = await Role.findById(job?.role);

        // =============================
        // DOCUMENT FETCH
        // =============================
        const document = await DocumentModel.findById(id);
        if (!document) {
            return NextResponse.json(
                { message: 'Hujjat topilmadi' },
                { status: 404 }
            );
        }
        if (document.status === DocumentStatus.SIGNED) {
            return NextResponse.json(
                { message: 'Hujjat allaqachon imzolangan!' },
                { status: 400 }
            );
        }

        // =============================
        // 1) USER IMZO QO‘YISH
        // =============================
        const signField = (field: any) => {
            if (!field) return field;

            if (Array.isArray(field)) {
                return field.map((item) =>
                    item.userId?.toString() === user._id.toString()
                        ? { ...item, hasSigned: true }
                        : item
                );
            }

            if (field.userId?.toString() === user._id.toString()) {
                field.hasSigned = true;
            }

            return field;
        };

        document.author = signField(document.author);
        document.sender = signField(document.sender);
        document.approvers = signField(document.approvers);
        document.receiver = signField(document.receiver);
        document.forwardedTo = signField(document.forwardedTo);

        // Commander imzosi
        if (document.bosSigned && role?.role === 'commander') {
            document.bosSigned.hasSigned = true;
        }

        // =============================
        // 2) SIGN COUNTING
        // =============================
        const countSigned = (field: any): number => {
            if (!field) return 0;
            if (Array.isArray(field)) {
                return field.filter((x) => x?.hasSigned === true).length;
            }
            return field.hasSigned ? 1 : 0;
        };

        const countFields = (field: any): number => {
            if (!field) return 0;
            if (Array.isArray(field)) return field.length;
            return 1;
        };

        const totalSigned =
            countSigned(document.author) +
            countSigned(document.sender) +
            countSigned(document.bosSigned) +
            countSigned(document.approvers) +
            countSigned(document.receiver) +
            countSigned(document.forwardedTo);

        const totalFields =
            countFields(document.author) +
            countFields(document.sender) +
            countFields(document.bosSigned) +
            countFields(document.approvers) +
            countFields(document.receiver) +
            countFields(document.forwardedTo);

        // =============================
        // 3) STRICT / LOOSE MODE + CUSTOM RULE
        // =============================
        const body = await request.json().catch(() => ({}));
        const mode = body.mode || 'strict';

        let signedCondition = false;

        if (mode === 'strict') {
            signedCondition = totalSigned === totalFields;
        } else if (mode === 'loose') {
            signedCondition = totalSigned >= 2;
        }

        // ✅ Custom qoida: kamida 2 ta imzo va ulardan kamida bittasi `true` bo‘lsa
        const anySigned =
            document.author?.hasSigned ||
            document.sender?.hasSigned ||
            document.bosSigned?.hasSigned ||
            (Array.isArray(document.approvers) &&
                document.approvers.some((x: { hasSigned: any }) => x.hasSigned)) ||
            (Array.isArray(document.receiver) &&
                document.receiver.some((x: { hasSigned: any }) => x.hasSigned)) ||
            (Array.isArray(document.forwardedTo) &&
                document.forwardedTo.some((x: { hasSigned: any }) => x.hasSigned));

        // 🔒 Boshliq imzosi majburiy
        const bossSignedRequired = document.bosSigned?.hasSigned === true;

        if (totalSigned >= 2 && anySigned && bossSignedRequired) {
            signedCondition = true;
        }

        // =============================
        // 4) YAKUNIY STATUS
        // =============================
        if (signedCondition) {
            document.status = DocumentStatus.SIGNED;
            document.allowedUsers = [document.owner];
        }

        await document.save();

        return NextResponse.json(
            {
                message: signedCondition
                    ? 'Hujjat to‘liq imzolandi'
                    : 'Imzo qo‘yildi, lekin hamma imzo yig‘ilmadi',
                status: document.status,
                totalSigned,
                totalFields,
                mode,
            },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: 'Server xatosi', error: error.message },
            { status: 500 }
        );
    }
}
