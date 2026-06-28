import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { generateCampaign } from '@/lib/campaign';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Génération de campagne = 2 appels IA lourds. On bride fortement.
const CAM_PER_MINUTE = parseInt(process.env.CAMPAIGN_RATE_PER_MINUTE || '2', 10);
const CAM_PER_DAY    = parseInt(process.env.CAMPAIGN_RATE_PER_DAY    || '5', 10);

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
    route: 'campaign-generate',
    perMinute: CAM_PER_MINUTE,
    perDay: CAM_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien de génération de campagne atteint. Réessayez demain.'
            : 'Génération déjà en cours. Patientez un instant.',
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

  const { cvText, jobTitle, codeRome, companies } = body;

  if (!cvText || !jobTitle || !codeRome) {
    return NextResponse.json(
      { error: 'Les champs cvText, jobTitle et codeRome sont requis.' },
      { status: 400 }
    );
  }
  if (!Array.isArray(companies) || companies.length === 0) {
    return NextResponse.json(
      { error: 'Le champ companies doit être un tableau non vide.' },
      { status: 400 }
    );
  }
  if (companies.length > 30) {
    return NextResponse.json(
      { error: 'Maximum 30 entreprises par campagne.' },
      { status: 400 }
    );
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const { campaignId, campaign } = await generateCampaign({
      uid, cvText, jobTitle, codeRome, companies,
    });

    // On journalise l'ID et le nombre d'entreprises, jamais le CV ni les emails.
    logEvent({
      event: 'campaign-generate', requestId, uid, status: 'ok',
      campaignId, companyCount: companies.length,
      durationMs: Date.now() - startedAt,
    });

    // On renvoie la campagne sans le cvText (non stocké dans Firestore, pas
    // besoin de le retransiter vers le client).
    return NextResponse.json({ campaignId, campaign });
  } catch (err) {
    logEvent({
      event: 'campaign-generate', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || 'Erreur génération de campagne.' },
      { status: 500 }
    );
  }
}
