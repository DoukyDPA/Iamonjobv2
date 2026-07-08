// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/avis/[avisId]/fiche
//
// GET → renvoie la fiche complète partagée par la personne (candidature ou
//       campagne), en direct, pour que le conseiller la lise en entier :
//       offre + lien, analyse, lettre, entretien / profil, entreprises, email.
//
// Les notes personnelles de la personne ne sont jamais transmises.
//
// Autorisation en chaîne :
//   1. rôle conseiller (custom claim, cookie __session)
//   2. le conseiller possède bien cet avis
//   3. la fiche demandée appartient au dossier de cet avis (l'authUid du
//      bénéficiaire == uid propriétaire de la fiche). Un partage ne peut donc
//      pas pointer vers la fiche d'une autre personne.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getAvisByIdForConseiller } from '@/lib/avis';
import { getBeneficiaireById } from '@/lib/beneficiaires';
import { getCandidatureById } from '@/lib/candidature';
import { getCampaignById } from '@/lib/campaign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Épuration : on retire les notes personnelles, on garde le contenu utile ──

function toMillis(ts) {
  return ts?.toMillis?.() ?? (ts?._seconds ? ts._seconds * 1000 : null);
}

function publicCandidature(c) {
  const offer = c.offer || {};
  const compat = c.compatibility || {};
  return {
    status: c.status ?? null,
    createdAt: toMillis(c.createdAt),
    offer: {
      intitule: offer.intitule ?? '',
      entreprise: offer.entreprise ?? '',
      lieu: offer.lieu ?? '',
      typeContrat: offer.typeContrat ?? '',
      url: offer.url ?? null,
      description: offer.description ?? '',
    },
    compatibility: {
      score: typeof compat.score === 'number' ? compat.score : null,
      forces: Array.isArray(compat.forces) ? compat.forces : [],
      faiblesses: Array.isArray(compat.faiblesses) ? compat.faiblesses : [],
      conseilGlobal: compat.conseilGlobal ?? '',
    },
    coverLetter: c.coverLetter ?? null,
    interviewPrep: c.interviewPrep ?? null,
    // c.notes (suivi personnel) volontairement omis.
  };
}

function publicCampaign(c) {
  const profile = c.candidateProfile || {};
  const tpl = c.emailTemplate || {};
  return {
    status: c.status ?? null,
    jobTitle: c.jobTitle ?? '',
    codeRome: c.codeRome ?? null,
    createdAt: toMillis(c.createdAt),
    candidateProfile: {
      summary: profile.summary ?? '',
      keySkills: Array.isArray(profile.keySkills) ? profile.keySkills : [],
      pitchLines: Array.isArray(profile.pitchLines) ? profile.pitchLines : [],
      decisionPoints: Array.isArray(profile.decisionPoints) ? profile.decisionPoints : [],
    },
    emailTemplate: {
      subject: tpl.subject ?? '',
      body: tpl.body ?? '',
    },
    companies: (Array.isArray(c.companies) ? c.companies : []).map((co) => ({
      name: co.name ?? '',
      city: co.city ?? '',
      zipcode: co.zipcode ?? '',
      nafText: co.nafText ?? '',
      headcountText: co.headcountText ?? '',
      stars: co.stars ?? null,
      decision: co.decision ?? 'pending',
      hasEmail: Boolean(co.email),
      emailBody: co.emailBody ?? null,
      website: co.website ?? null,
      lbbUrl: co.lbbUrl ?? co.url ?? null,
      // co.notes (note personnelle par entreprise) volontairement omis.
    })),
    // c.notes et validationLog.advisorNotes volontairement omis.
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const { avisId } = params;

  try {
    const avis = await getAvisByIdForConseiller(avisId, uid);
    if (!avis) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 });

    const shared = avis.context?.shared;
    if (!shared?.kind || !shared?.id) {
      return NextResponse.json({ error: 'Aucune fiche partagée sur cette demande.' }, { status: 404 });
    }

    const beneficiaire = await getBeneficiaireById(avis.beneficiaireId);
    const ownerUid = beneficiaire?.authUid;
    if (!ownerUid) {
      // Dossier pas encore activé : la fiche ne peut pas lui appartenir.
      return NextResponse.json({ error: 'Fiche indisponible.' }, { status: 404 });
    }

    if (shared.kind === 'candidature') {
      const c = await getCandidatureById(shared.id, ownerUid);
      if (!c) return NextResponse.json({ error: 'Fiche indisponible.' }, { status: 404 });
      return NextResponse.json({ kind: 'candidature', fiche: publicCandidature(c) });
    }

    if (shared.kind === 'campaign') {
      const c = await getCampaignById(shared.id, ownerUid);
      if (!c) return NextResponse.json({ error: 'Fiche indisponible.' }, { status: 404 });
      return NextResponse.json({ kind: 'campaign', fiche: publicCampaign(c) });
    }

    return NextResponse.json({ error: 'Type de fiche non pris en charge.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
