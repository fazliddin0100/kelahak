// app/api/documents/route.ts
import {type NextRequest, NextResponse} from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Personal from "@/models/Personal";
import {getUserId} from "@/lib/userid";
import Job from "@/models/Job";
import {sanitizeHTML} from "@/lib/purify";
import {DocumentModel} from "@/models/DocumentModal";
import {DocumentStatus} from "@/types/document-status.enum";

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const userId = getUserId(request);

        const {title, content = "", grif = "", copyNumber = ""} = await request.json();

        if (!title || title.trim() === "") {
            return NextResponse.json({message: "Title majburiy maydon"}, {status: 400});
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({message: "Foydalanuvchi topilmadi"}, {status: 404});
        }

        // province
        const personal = await Personal.findById(user.personal)
        if (!personal) {
            return NextResponse.json(
                {message: "Foydalanuvchining viloyati topilmadi"},
                {status: 400}
            );
        }

        // role
        const job = await Job.findById(user.job)

        const cleanContent = content.trim() ? sanitizeHTML(content) : {};

        const document = new DocumentModel({
            title: title.trim(),
            content: cleanContent,
            grif: grif.trim(),
            copyNumber: Array.isArray(copyNumber) ? copyNumber : [copyNumber].filter(Boolean),
            owner: userId,
            status: DocumentStatus.YANGI,
            ownerRegion: personal.province,
            author: {
                userId: userId,
                fullName: personal.name + personal.fName + personal.sName || "",
                militaryRank: job.militaryRank || "",
                position: job.position || "",
                hasSigned: false,
            },
        });

        await document.save();

        const populatedDoc = await DocumentModel.findById(document._id)
            .populate("owner", "fullName militaryRank position")
            .populate("author.userId", "fullName militaryRank position")
            .lean();

        return NextResponse.json(populatedDoc, {status: 201});
    } catch (error: any) {
        console.error("Hujjat yaratishda xato:", error);
        return NextResponse.json(
            {message: "Hujjat yaratishda xatolik", error: error.message},
            {status: 500}
        );
    }
}
