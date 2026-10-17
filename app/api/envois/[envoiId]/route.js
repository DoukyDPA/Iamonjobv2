// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/envois/[envoiId]  (côté personne accompagnée)
//
// POST → body { action: 'vu' }                       marque l'envoi comme lu
//        body { action: 'reponse', texte }           répond à une offre / un message
//        body { action: 'questionnaire', answers }   répond au questionnaire
//        body { action: 'signer' }                   signe un document en ligne
//
// Accès : rôle `beneficiaire`, et l'envoi doit viser son dossier.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { markVu, replyEnvoi, answerQuestionnaireEnvoi, signDocumentEnvoi } from '@/lib/envois';
import { notifyConseillerNewMessage } from '@/lib/avis';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });

  const requestId = newRequestId();
  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    if (!beneficiaire) return NextResponse.json({ error: "Aucun accompagnement n'est rattaché à votre compte." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const envoiId = String(params.envoiId || '');

    if (body.action === 'vu') {
      return NextResponse.json(await markVu({ envoiId, beneficiaire }));
    }

    const limit = await enforceRateLimit({ uid, route: 'envoi-reponse', perMinute: 10, perDay: 100 });
    if (!limit.allowed) return NextResponse.json({ error: 'Trop de réponses envoyées. Patientez un peu.' }, { status: 429 });

    if (body.action === 'reponse') {
      const res = await replyEnvoi({ envoiId, beneficiaire, texte: body.texte });
      notifyConseillerNewMessage({ conseillerUid: res.conseillerUid, beneficiaireCode: beneficiaire.code }).catch(() => {});
      logEvent({ event: 'envoi-reponse', requestId, uid, status: 'ok' });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'signer') {
      const res = await signDocumentEnvoi({ envoiId, beneficiaire });
      logEvent({ event: 'document-signe', requestId, uid, status: 'ok' });
      return NextResponse.json({ ok: true, deja: Boolean(res.deja) });
    }
    if (body.action === 'questionnaire') {
      const res = await answerQuestionnaireEnvoi({ envoiId, beneficiaire, answers: body.answers || {} });
      logEvent({ event: 'envoi-questionnaire', requestId, uid, status: 'ok' });
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (err) {
    logEvent({ event: 'envoi-reponse', requestId, uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || "L'enregistrement a échoué.", missing: err.missing || [] }, { status: err.status || 500 });
  }
}
