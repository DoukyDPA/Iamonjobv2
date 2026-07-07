import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getSalaryStats } from '@/lib/salary';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Plafonds par utilisateur (modifiables via variables d'environnement).
const SALARY_PER_MINUTE = parseInt(process.env.SALARY_RATE_PER_MINUTE || '20', 10);
const SALARY_PER_DAY = parseInt(process.env.SALARY_RATE_PER_DAY || '300', 10);

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
    route: 'salary',
    perMinute: SALARY_PER_MINUTE,
    perDay: SALARY_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien atteint. Réessayez demain.'
            : 'Trop de requêtes. Patientez un instant avant de réessayer.',
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

  const { jobTitle, location } = body;
  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
    return NextResponse.json({ error: 'Le champ jobTitle est requis.' }, { status: 400 });
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const salary = await getSalaryStats({ jobTitle, location });
    // On journalise seulement la présence/absence de résultat, jamais l'intitulé
    // (le métier ciblé est une donnée personnelle liée au projet de l'utilisateur).
    logEvent({
      event: 'salary', requestId, uid, status: 'ok',
      resultCount: salary ? 1 : 0, durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ salary });
  } catch (err) {
    logEvent({
      event: 'salary', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur récupération salaire.' },
      { status: 500 }
    );
  }
}
