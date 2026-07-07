// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/avis  (côté personne accompagnée)
//
// GET  → liste les demandes d'avis de la personne connectée, avec les réponses
// POST → crée une demande d'avis à partir des emplois affichés
//
// Accès : rôle `beneficiaire` (défaut). Le conseiller rattaché est lu dans le
// dossier Firestore via authUid, jamais transmis par le client.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { createAvisRequest, listAvisForBeneficiaire } from '@/lib/avis';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    // `linked` : la personne a un conseiller rattaché. Un utilisateur inscrit
    // librement (hors accompagnement) n'en a pas ; le bouton reste alors masqué.
    if (!beneficiaire) return NextResponse.json({ linked: false, avis: [] });
    const avis = await listAvisForBeneficiaire(beneficiaire.id);
    return NextResponse.json({ linked: Boolean(beneficiaire.conseillerUid), avis });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });

  const requestId = newRequestId();
  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    if (!beneficiaire) {
      return NextResponse.json({ error: 'Aucun conseiller rattaché à votre compte.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { avisId } = await createAvisRequest({
      beneficiaire,
      context: body.context || {},
      note: body.note || '',
    });

    logEvent({ event: 'avis-create', requestId, uid, status: 'ok', avisId });
    return NextResponse.json({ avisId });
  } catch (err) {
    logEvent({ event: 'avis-create', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur envoi.' }, { status: 500 });
  }
}
