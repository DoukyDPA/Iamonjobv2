import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request) {
  const { token } = await request.json();

  try {
    await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Token invalide.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('__session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 heure (durée de vie d'un ID token Firebase)
    path: '/',
  });
  return response;
}
