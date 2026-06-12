import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { searchOffers } from '@/lib/france-travail';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Plafonds par utilisateur (modifiables via variables d'environnement).
const FT_PER_MINUTE = parseInt(process.env.FT_RATE_PER_MINUTE || '20', 10);
const FT_PER_DAY = parseInt(process.env.FT_RATE_PER_DAY || '300', 10);

export async function POST(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  // ─── Limitation de débit par utilisateur ───────────────────────────────
  const rate = await enforceRateLimit({
    uid,
    route: 'france-travail',
    perMinute: FT_PER_MINUTE,
    perDay: FT_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien de recherches atteint. Réessayez demain.'
            : 'Trop de recherches. Patientez un instant avant de réessayer.',
      },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter || 60) } }
    );
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

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const offers = await searchOffers({ keywords, location, limit });
    // On journalise le nombre de résultats, jamais les mots-clés (donnée perso).
    logEvent({
      event: 'france-travail', requestId, uid, status: 'ok',
      resultCount: offers.length, durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ offers });
  } catch (err) {
    logEvent({
      event: 'france-travail', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur recherche offres.' },
      { status: 500 }
    );
  }
}
