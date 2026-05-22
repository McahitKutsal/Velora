import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from '@/lib/repo/investments';

function fail(e) {
  console.error('investments API error:', e);
  return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    return NextResponse.json(await listInvestments(user.userId));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const body = await req.json();
    return NextResponse.json(await createInvestment(user.userId, body));
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
    return NextResponse.json(await updateInvestment(user.userId, id, rest));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const { id } = await req.json();
    return NextResponse.json(await deleteInvestment(user.userId, id));
  } catch (e) {
    return fail(e);
  }
}
