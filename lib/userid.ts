// lib/auth.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface IUserDocument {
  userId: string;
}

export const getUserId = (request: NextRequest): string | null => {
  // 1. Headerdan olish
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  // 2. Agar headerda bo‘lmasa, cookie’dan olish
  if (!token) {
    const cookieToken = request.cookies.get('token')?.value; // cookie nomi "token"
    token = cookieToken || null;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IUserDocument;
    return decoded.userId;
  } catch (err) {
    console.log('JWT verify error:', err);
    return null;
  }
};
