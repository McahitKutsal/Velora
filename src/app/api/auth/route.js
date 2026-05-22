import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { upsertGoogleUser } from '@/lib/repo/users';
import { signSession } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function POST(req) {
  try {
    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    const user = await upsertGoogleUser({ googleId, email, name, picture });
    const token = signSession(user);

    return NextResponse.json({
      token,
      user: { email, name, picture },
    });
  } catch (e) {
    console.error('Auth error:', e);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
