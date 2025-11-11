// lib/auth.ts
import {NextRequest} from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface IUserDocument {
    userId: string;
}

export const getUserId = (request: NextRequest): string | null => {
    const authHeader = request.headers.get("authorization");

    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as IUserDocument;
        return decoded.userId;
    } catch (err) {
        console.log(err)
        return null;
    }
};
