import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from '@/lib/repo/investments';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  return NextResponse.json(listInvestments(user.userId));
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const body = await req.json();
  return NextResponse.json(createInvestment(user.userId, body));
}

export async function PUT(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const body = await req.json();
  const { id, ...rest } = body;
  return NextResponse.json(updateInvestment(user.userId, id, rest));
}

export async function DELETE(req) {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const { id } = await req.json();
  return NextResponse.json(deleteInvestment(user.userId, id));
}
