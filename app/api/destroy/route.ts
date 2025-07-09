// app/api/destroy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  const { id, adminPassword } = await request.json();

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  await redis.del(id);
  return NextResponse.json({ message: 'Record destroyed.' });
}