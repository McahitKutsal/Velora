import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  listCards,
  createCard,
  createCards,
  updateCard,
  deleteCard,
} from '@/lib/repo/flashcards';

function fail(e) {
  console.error('flashcards API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: e?.status || 500 });
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const deckId = req.nextUrl.searchParams.get('deckId');
    if (!deckId) return NextResponse.json({ error: 'deckId gerekli' }, { status: 400 });
    return NextResponse.json(await listCards(user.userId, deckId));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const body = await req.json();
    const { deckId, cards, ...card } = body;
    if (Array.isArray(cards)) {
      return NextResponse.json(await createCards(user.userId, deckId, cards));
    }
    return NextResponse.json(await createCard(user.userId, deckId, card));
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
    return NextResponse.json(await updateCard(user.userId, id, rest));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const { id } = await req.json();
    return NextResponse.json(await deleteCard(user.userId, id));
  } catch (e) {
    return fail(e);
  }
}
