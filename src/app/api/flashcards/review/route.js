import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { reviewCard } from '@/lib/repo/flashcards';
import { RATINGS } from '@/lib/srs';

function fail(e) {
  console.error('review API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: e?.status || 500 });
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, rating } = await req.json();
    if (!RATINGS.includes(rating)) {
      return NextResponse.json({ error: 'Geçersiz değerlendirme' }, { status: 400 });
    }
    return NextResponse.json(await reviewCard(user.userId, id, rating));
  } catch (e) {
    return fail(e);
  }
}
