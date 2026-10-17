// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]
//
// GET    → fiche de la personne pour son conseiller : métiers mis de côté à
//          l'étape 2 (étoile) et pistes proposées, envois et réponses.
//          Le texte du CV n'est jamais renvoyé.
//
// DELETE → le conseiller supprime définitivement un dossier qu'il suit :
//          données applicatives (candidatures, campagnes, CV, avis, usage),
//          puis le compte Firebase Auth s'il avait été activé.
//
// Accès : rôle conseiller, et le dossier doit lui appartenir (conseillerUid).
// Action irréversible (droit à l'effacement, RGPD article 17).
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { listEnvoisForConseiller } from '@/lib/envois';
import { getBeneficiaireById, purgeBeneficiaire } from '@/lib/beneficiaires';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const job = (j) => ({ title: String(j?.title || '').slice(0, 160), codeRome: j?.codeRome || null });

export async function GET(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const b = await getBeneficiaireById(params.beneficiaireId);
    if (!b) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (b.conseillerUid !== uid) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });

    let metiers = { favoris: [], pistes: { proches: [], logiques: [], eloignes: [] }, analyseLe: null };
    if (b.authUid) {
      const cv = await adminDb.doc(`cvs/${b.authUid}`).get();
      if (cv.exists) {
        const d = cv.data();
        const sug = d.analysis?.suggestions || {};
        metiers = {
          favoris: (Array.isArray(d.favoriteJobs) ? d.favoriteJobs : []).map(job).filter((j) => j.title),
          pistes: {
            proches: (sug.proches || []).map(job).filter((j) => j.title),
            logiques: (sug.logiques || []).map(job).filter((j) => j.title),
            eloignes: (sug.eloignes || []).map(job).filter((j) => j.title),
          },
          analyseLe: d.updatedAt?.toMillis?.() ?? null,
          favorisLe: d.favoriteJobsUpdatedAt?.toMillis?.() ?? null,
        };
      }
    }
    const envois = await listEnvoisForConseiller(uid, { beneficiaireId: b.id });
    return NextResponse.json({
      dossier: {
        id: b.id, code: b.code, status: b.status || 'invited', promo: b.promo || null,
        parcoursId: b.parcoursId || null, promoArchivee: Boolean(b.promoArchivee),
        transferts: (b.transferts || []).map((t) => ({ le: t.le, recu: t.vers === uid })),
      },
      metiers,
      envois,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const { beneficiaireId } = params;
  const requestId = newRequestId();

  try {
    const beneficiaire = await getBeneficiaireById(beneficiaireId);
    if (!beneficiaire) {
      return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    }
    if (beneficiaire.conseillerUid !== uid) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { authUid } = await purgeBeneficiaire(beneficiaireId);

    // Compte d'authentification (seulement si le code avait été activé).
    if (authUid) {
      try { await adminAuth.deleteUser(authUid); } catch { /* déjà absent : on continue */ }
    }

    logEvent({ event: 'beneficiaire-delete', requestId, uid, status: 'ok', beneficiaireId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'beneficiaire-delete', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'La suppression a échoué.' }, { status: 500 });
  }
}
