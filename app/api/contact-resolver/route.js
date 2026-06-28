import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { resolveContacts } from '@/lib/contact-resolver';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Limite légère : l'appel fait du DNS + une requête Annuaire, pas de quota
// IA ni France Travail. On borne quand même pour éviter l'abus.
const CR_PER_MINUTE = parseInt(process.env.CR_RATE_PER_MINUTE || '5', 10);
const CR_PER_DAY    = parseInt(process.env.CR_RATE_PER_DAY    || '30', 10);

// Nombre max d'entreprises par appel (une campagne standard = 10-20 cibles).
const MAX_COMPANIES = 30;

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
    route: 'contact-resolver',
    perMinute: CR_PER_MINUTE,
    perDay: CR_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien de résolution de contacts atteint. Réessayez demain.'
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

  const { companies } = body;
  if (!Array.isArray(companies) || companies.length === 0) {
    return NextResponse.json(
      { error: 'Le champ companies doit être un tableau non vide.' },
      { status: 400 }
    );
  }
  if (companies.length > MAX_COMPANIES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_COMPANIES} entreprises par appel.` },
      { status: 400 }
    );
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const resolved = await resolveContacts(companies);

    const stats = resolved.reduce((acc, r) => {
      acc[r.method] = (acc[r.method] || 0) + 1;
      return acc;
    }, {});

    // On journalise les statistiques (méthodes de résolution), jamais les
    // adresses emails ni les noms d'entreprises.
    logEvent({
      event: 'contact-resolver', requestId, uid, status: 'ok',
      total: resolved.length, stats, durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ resolved });
  } catch (err) {
    logEvent({
      event: 'contact-resolver', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur résolution contacts.' },
      { status: 500 }
    );
  }
}
