// app/api/destroy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  await redis.del(id);
  revalidatePath('/');
  return NextResponse.json({ message: 'Record destroyed.' });
}