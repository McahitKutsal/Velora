import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getStats } from '@/lib/repo/flashcards';

function fail(e) {
  console.error('flashcard stats API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: e?.status || 500 });
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await getStats(user.userId));
  } catch (e) {
    return fail(e);
  }
}
