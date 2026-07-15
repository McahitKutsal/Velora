import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getStudyQueue } from '@/lib/repo/flashcards';

function fail(e) {
  console.error('study API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: e?.status || 500 });
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const deckId = req.nextUrl.searchParams.get('deckId') || 'all';
    const cram = req.nextUrl.searchParams.get('cram') === '1';
    return NextResponse.json(await getStudyQueue(user.userId, deckId, { cram }));
  } catch (e) {
    return fail(e);
  }
}
