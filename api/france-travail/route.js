import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { searchOffers } from '@/lib/france-travail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { keywords, location, limit } = body;
  if (!keywords) {
    return NextResponse.json({ error: 'Le champ keywords est requis.' }, { status: 400 });
  }

  try {
    const offers = await searchOffers({ keywords, location, limit });
    return NextResponse.json({ offers });
  } catch (err) {
    console.error('Erreur France Travail :', err);
    return NextResponse.json(
      { error: err.message || 'Erreur recherche offres.' },
      { status: 500 }
    );
  }
}
