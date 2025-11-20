import { NextResponse } from 'next/server';
import FileModel from '@/models/File';
import connectToDatabase from '@/lib/mongodb';

export async function GET() {
  try {
    await connectToDatabase();

    const files = await FileModel.find().sort({ createdAt: -1 }); // eng oxirgi fayllar birinchi chiqadi

    return NextResponse.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
