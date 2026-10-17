// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/questionnaires  (côté personne accompagnée)
//
// GET  → parcours de la personne, étapes et état de chaque questionnaire,
//        avec la définition des questionnaires disponibles
// POST → enregistre ou corrige la réponse à un questionnaire du parcours
//        body : { questionnaireId, answers }
//
// Accès : rôle `beneficiaire`. Le dossier et son parcours sont lus côté serveur
// via authUid, jamais transmis par le client.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { getParcoursState, saveReponse } from '@/lib/questionnaires/reponses';
import { closeEnvoisForQuestionnaire } from '@/lib/envois';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    if (!beneficiaire) return NextResponse.json({ parcours: null, etapes: [] });
    const state = await getParcoursState(beneficiaire);
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });

  const requestId = newRequestId();
  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    if (!beneficiaire) {
      return NextResponse.json({ error: "Aucun accompagnement n'est rattaché à votre compte." }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const result = await saveReponse({
      beneficiaire,
      questionnaireId: String(body.questionnaireId || ''),
      answers: body.answers || {},
    });
    // Un envoi du conseiller qui demandait ce questionnaire est soldé.
    await closeEnvoisForQuestionnaire({
      beneficiaireId: beneficiaire.id, questionnaireId: String(body.questionnaireId || ''), reponseId: result.id,
    }).catch(() => {});
    logEvent({ event: 'questionnaire-submit', requestId, uid, status: 'ok', questionnaireId: body.questionnaireId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logEvent({ event: 'questionnaire-submit', requestId, uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json(
      { error: err.message || "L'enregistrement a échoué.", missing: err.missing || [] },
      { status: err.status || 500 }
    );
  }
}
