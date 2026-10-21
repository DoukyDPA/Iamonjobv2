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
import { SORTIE_IDS } from '@/lib/sortie';
import { FieldValue } from '@/lib/firebase/admin';

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
    // Avancement, pour préparer un rendez-vous en deux minutes. Jamais le texte
    // du CV ni celui des lettres : des repères et des intitulés seulement.
    const avancement = { cv: false, analyse: false, noteCv: null, favoris: 0, candidatures: [], campagnes: [] };
    if (b.authUid) {
      const [cv, candSnap, campSnap] = await Promise.all([
        adminDb.doc(`cvs/${b.authUid}`).get(),
        adminDb.collection('candidatures').where('uid', '==', b.authUid).limit(50).get(),
        adminDb.collection('campaigns').where('uid', '==', b.authUid).limit(20).get(),
      ]);
      avancement.candidatures = candSnap.docs.map((c) => {
        const v = c.data();
        return {
          id: c.id,
          intitule: String(v.offer?.intitule || '').slice(0, 160),
          entreprise: String(v.offer?.entreprise || '').slice(0, 120),
          score: typeof v.compatibility?.score === 'number' ? v.compatibility.score : null,
          status: v.status || 'saved',
          lettre: Boolean(v.coverLetter),
          createdAt: v.createdAt?.toMillis?.() ?? null,
          sentAt: v.sentAt ?? null,
        };
      }).sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0));
      avancement.campagnes = campSnap.docs.map((c) => {
        const v = c.data();
        const companies = Array.isArray(v.companies) ? v.companies : [];
        return {
          id: c.id,
          metier: String(v.jobTitle || '').slice(0, 160),
          entreprises: companies.length,
          retenues: companies.filter((x) => x.decision === 'keep').length,
          createdAt: v.createdAt?.toMillis?.() ?? null,
        };
      }).sort((x, y) => (y.createdAt ?? 0) - (x.createdAt ?? 0));
      if (cv.exists) {
        const d = cv.data();
        avancement.cv = Boolean(String(d.cvText || '').trim());
        avancement.analyse = Boolean(d.analysis);
        avancement.noteCv = typeof d.rating?.score === 'number' ? d.rating.score : null;
        avancement.favoris = Array.isArray(d.favoriteJobs) ? d.favoriteJobs.length : 0;
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
        sortie: b.sortie || null,
        parcoursId: b.parcoursId || null, promoArchivee: Boolean(b.promoArchivee),
        transferts: (b.transferts || []).map((t) => ({ le: t.le, recu: t.vers === uid })),
      },
      metiers,
      avancement,
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

// PATCH → situation à la sortie : { sortie: { situation, date, precision } }
//         ou { sortie: null } pour l'effacer.
export async function PATCH(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const b = await getBeneficiaireById(params.beneficiaireId);
    if (!b) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (b.conseillerUid !== uid) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    let sortie = null;
    if (body.sortie) {
      const situation = String(body.sortie.situation || '');
      if (!SORTIE_IDS.includes(situation)) return NextResponse.json({ error: 'Situation inconnue.' }, { status: 400 });
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.sortie.date || '')) ? body.sortie.date : new Date().toISOString().slice(0, 10);
      sortie = { situation, date, precision: String(body.sortie.precision || '').slice(0, 200) };
    }
    await adminDb.doc(`beneficiaires/${b.id}`).set({ sortie, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true, sortie });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Enregistrement impossible.' }, { status: 500 });
  }
}
