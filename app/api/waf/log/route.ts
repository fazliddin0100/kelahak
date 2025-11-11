// app/api/waf/log/route.ts
import {NextResponse} from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export interface IWafLog {
    ip?: string;
    path: string;
    keyword: string;
    userAgent?: string;
    timestamp: Date;
}

const WafLogSchema = new mongoose.Schema<IWafLog>(
    {
        ip: String,
        path: {type: String, required: true},
        keyword: {type: String, required: true},
        userAgent: String,
        timestamp: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

const WafLog = mongoose.models.WafLog || mongoose.model("WafLog", WafLogSchema);

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const log = await WafLog.create({
            ip: body.ip,
            path: body.path,
            keyword: body.keyword,
            userAgent: body.userAgent,
        });

        return NextResponse.json({success: true, log});
    } catch (err) {
        console.error("WAF log API error:", err);
        return NextResponse.json({success: false, error: "Server error"}, {status: 500});
    }
}
