// ════════════════════════════════════════════════════════════════════════════
// Route POST /api/campaign/[campaignId]/send — Lot 5
//
// Déclenche l'envoi des emails pour une campagne validée.
// Vérifie que status === 'validated' ou 'sending' (reprise partielle).
// Délègue le travail à processSendQueue (file d'envoi avec étalement).
//
// Quota : SEND_RATE_PER_DAY — nombre max de déclenchements par jour (défaut 3).
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getCampaignById } from '@/lib/campaign';
import { processSendQueue } from '@/lib/send-queue';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Un déclenchement d'envoi = N appels Resend + N délais.
// On bride pour éviter les abus tout en permettant la reprise quotidienne.
const SEND_PER_MINUTE = parseInt(process.env.SEND_RATE_PER_MINUTE || '1', 10);
const SEND_PER_DAY    = parseInt(process.env.SEND_RATE_PER_DAY    || '3', 10);

export async function POST(request, { params }) {
  // ── 1. Authentification ──────────────────────────────────────────────
  const token = request.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  // ── 2. Rate limiting ─────────────────────────────────────────────────
  const rate = await enforceRateLimit({
    uid,
    route: 'campaign-send',
    perMinute: SEND_PER_MINUTE,
    perDay: SEND_PER_DAY,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.scope === 'day'
            ? 'Quota quotidien d\'envoi atteint. Revenez demain pour envoyer le prochain lot.'
            : 'Un envoi est déjà en cours. Patientez un instant.',
      },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter || 60) } }
    );
  }

  // ── 3. Lecture et vérification de la campagne ─────────────────────────
  const { campaignId } = await params;

  let campaign;
  try {
    campaign = await getCampaignById(campaignId, uid);
  } catch (err) {
    return NextResponse.json({ error: 'Erreur lecture campagne.' }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
  }

  // L'envoi n'est autorisé que sur une campagne validée ou en cours d'envoi
  // (reprise partielle si le batch précédent n'a pas tout couvert).
  if (campaign.status !== 'validated' && campaign.status !== 'sending') {
    return NextResponse.json(
      {
        error: `Envoi impossible : la campagne est en statut « ${campaign.status} ». Elle doit être validée d'abord.`,
      },
      { status: 422 }
    );
  }

  // ── 4. Traitement de la file d'envoi ─────────────────────────────────
  const requestId = newRequestId();
  const startedAt = Date.now();

  try {
    const { sent, errors, remaining, campaignStatus } = await processSendQueue(
      campaignId,
      campaign
    );

    logEvent({
      event: 'campaign-send', requestId, uid, status: 'ok',
      campaignId, sent, errorsCount: errors.length, remaining, campaignStatus,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ sent, errors, remaining, campaignStatus });
  } catch (err) {
    logEvent({
      event: 'campaign-send', requestId, uid, status: 'error',
      campaignId, error: err.message, level: 'error',
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: err.message || 'Erreur lors de l\'envoi.' },
      { status: 500 }
    );
  }
}
