import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getRomeFromLabel } from '@/lib/france-travail';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Partage le quota IA (cette route consomme Gemini, pas l'API France Travail).
const ROME_PER_MINUTE = parseInt(process.env.AI_RATE_PER_MINUTE || '15', 10);
const ROME_PER_DAY    = parseInt(process.env.AI_RATE_PER_DAY    || '200', 10);

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

  const rate = await enforceRateLimit({
    uid,
    route: 'rome',
    perMinute: ROME_PER_MINUTE,
    perDay: ROME_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien de recherches ROME atteint. Réessayez demain.'
            : 'Trop de requêtes. Patientez un instant.',
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

  const { label, limit } = body;
  if (!label || typeof label !== 'string' || !label.trim()) {
    return NextResponse.json({ error: 'Le champ label est requis.' }, { status: 400 });
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const metiers = await getRomeFromLabel(label.trim(), limit ?? 5);
    logEvent({
      event: 'rome', requestId, uid, status: 'ok',
      resultCount: metiers.length, durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ metiers });
  } catch (err) {
    logEvent({
      event: 'rome', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur ROME 4.0.' },
      { status: 500 }
    );
  }
}
