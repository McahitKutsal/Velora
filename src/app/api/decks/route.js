import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { listDecks, createDeck, updateDeck, deleteDeck } from '@/lib/repo/flashcards';

function fail(e) {
  console.error('decks API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: e?.status || 500 });
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    return NextResponse.json(await listDecks(user.userId));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const body = await req.json();
    return NextResponse.json(await createDeck(user.userId, body));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const body = await req.json();
    const { id, ...rest } = body;
    return NextResponse.json(await updateDeck(user.userId, id, rest));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const { id } = await req.json();
    return NextResponse.json(await deleteDeck(user.userId, id));
  } catch (e) {
    return fail(e);
  }
}
