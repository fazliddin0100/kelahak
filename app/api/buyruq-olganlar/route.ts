// app/api/buyruq-olganlar/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const users = [
    {
      id: 1,
      name: 'Fayzullayev D.M.',
      department: 'Kotibiyat',
      expireDate: '12.15.2024 yilga qadar',
    },
    {
      id: 2,
      name: 'Karimov A.A.',
      department: 'Buxgalteriya',
      expireDate: '01.10.2025 yilga qadar',
    },
  ];
  return NextResponse.json(users);
}
