import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { resetCard } from '@/lib/repo/flashcards';

function fail(e) {
  console.error('reset API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: e?.status || 500 });
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await req.json();
    return NextResponse.json(await resetCard(user.userId, id));
  } catch (e) {
    return fail(e);
  }
}
