// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]/synthese
//
// POST → « Préparer mon rendez-vous » : une synthèse d'une dizaine de lignes
//        du dossier, juste avant l'entretien. Mistral (France) reçoit des
//        repères et des intitulés : métiers, candidatures et leur statut,
//        notes des questionnaires, messages échangés. Jamais le texte du CV,
//        jamais de nom (le code seulement).
// Accès : conseiller du dossier. Rien n'est enregistré.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getBeneficiaireById } from '@/lib/beneficiaires';
import { listReponsesForConseiller, getReponseForConseiller } from '@/lib/questionnaires/reponses';
import { listAvisForBeneficiaire } from '@/lib/avis';
import { listEnvoisForConseiller } from '@/lib/envois';
import { statusInfo } from '@/lib/candidature-status';
import { sortieLabel } from '@/lib/sortie';
import { callMistral } from '@/lib/ai/mistral';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM = `Tu aides un conseiller emploi à préparer un rendez-vous avec une personne qu'il accompagne.
Tu reçois des repères sur son dossier (pas son CV). Écris en français, phrases courtes, ton professionnel et humain.
Ne juge pas la personne. N'invente rien : si une information manque, dis-le simplement.
Format, en texte brut, sans markdown, une dizaine de lignes au total :
OÙ EN EST LA PERSONNE : 2 ou 3 phrases.
CE QUI VA BIEN : 1 ou 2 points.
POINTS DE VIGILANCE : 1 à 3 points (moral en baisse, candidatures sans suite, silence, engagement non tenu…).
À ABORDER EN RENDEZ-VOUS : 3 points concrets.
UNE QUESTION POUR OUVRIR L'ÉCHANGE : une seule, ouverte.`;

const day = (ms) => (ms ? new Date(ms).toLocaleDateString('fr-FR') : '?');
const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();

  const rl = await enforceRateLimit({ uid, route: 'synthese-rdv', perMinute: 6, perDay: 120 });
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de demandes rapprochées. Patientez un instant.' }, { status: 429 });

  try {
    const b = await getBeneficiaireById(params.beneficiaireId);
    if (!b) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (b.conseillerUid !== uid) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });

    const L = [`Personne : ${b.code}${b.promo ? `, promo ${b.promo}` : ''}.`];
    L.push(`Accès : ${b.status === 'active' ? `activé le ${day(b.activatedAt?.toMillis?.())}` : 'pas encore activé'}.`);
    if (b.sortie) L.push(`Sortie déjà renseignée : ${sortieLabel(b.sortie.situation)} (${b.sortie.date}).`);

    if (b.authUid) {
      try {
        const u = await adminAuth.getUser(b.authUid);
        const t = [u.metadata?.lastRefreshTime, u.metadata?.lastSignInTime].map((x) => (x ? Date.parse(x) : 0));
        L.push(`Dernière visite : ${day(Math.max(...t))}.`);
      } catch { /* compte absent */ }
      const [cv, cand, camp] = await Promise.all([
        adminDb.doc(`cvs/${b.authUid}`).get(),
        adminDb.collection('candidatures').where('uid', '==', b.authUid).limit(30).get(),
        adminDb.collection('campaigns').where('uid', '==', b.authUid).limit(10).get(),
      ]);
      const d = cv.exists ? cv.data() : {};
      L.push(`CV : ${d.cvText ? 'importé' : 'pas encore importé'}${typeof d.rating?.score === 'number' ? `, noté ${d.rating.score}/20` : ''}.`);
      const fav = (d.favoriteJobs || []).map((j) => j.title).filter(Boolean);
      L.push(`Métiers mis de côté : ${fav.length ? fav.join(', ') : 'aucun'}.`);
      const pistes = ['proches', 'logiques', 'eloignes'].flatMap((k) => (d.analysis?.suggestions?.[k] || []).map((j) => j.title)).filter(Boolean);
      if (pistes.length) L.push(`Pistes proposées par l'analyse : ${pistes.slice(0, 9).join(', ')}.`);
      const cs = cand.docs.map((x) => x.data());
      L.push(`Offres analysées : ${cs.length}.`);
      cs.slice(0, 12).forEach((c) => L.push(`- ${cut(c.offer?.intitule, 80)} chez ${cut(c.offer?.entreprise, 60)} : correspondance ${c.compatibility?.score ?? '?'} %, ${statusInfo(c.status).label}${c.sentAt ? ` (envoyée le ${day(c.sentAt)})` : ''}.`));
      if (camp.size) L.push(`Campagnes de candidatures spontanées : ${camp.docs.map((x) => cut(x.data().jobTitle, 60)).join(', ')}.`);
    }

    // Questionnaires de suivi : notes par étape, et le détail de la dernière fiche.
    const reps = (await listReponsesForConseiller(uid)).filter((r) => r.beneficiaireId === b.id).sort((x, y) => (x.submittedAt ?? 0) - (y.submittedAt ?? 0));
    if (reps.length) {
      L.push('Questionnaires de suivi (notes sur 10) :');
      reps.slice(-6).forEach((r) => {
        const s = Object.entries(r.socle || {}).filter(([, v]) => typeof v === 'number' || typeof v === 'string').map(([k, v]) => `${k} ${v}`).join(', ');
        L.push(`- ${r.etape ? `S${r.etape}` : cut(r.titre, 40)} du ${day(r.submittedAt)} : ${s || 'sans notes'}`);
      });
      const last = await getReponseForConseiller(reps[reps.length - 1].id, uid).catch(() => null);
      if (last?.detail?.length) {
        L.push('Dernière fiche, réponses écrites :');
        last.detail.filter((q) => typeof q.reponse === 'string' && q.reponse.length > 2).slice(0, 8)
          .forEach((q) => L.push(`- ${cut(q.question, 90)} : ${cut(q.reponse, 220)}`));
      }
    } else {
      L.push('Aucun questionnaire de suivi rempli.');
    }

    const avis = await listAvisForBeneficiaire(b.id);
    if (avis.length) {
      L.push('Messages de la personne :');
      avis.slice(0, 6).forEach((a) => L.push(`- ${day(a.createdAt)} : « ${cut(a.note, 200)} »${a.reply ? ` (réponse du conseiller : « ${cut(a.reply, 120)} »)` : ' (sans réponse)'}`));
    }
    const envois = await listEnvoisForConseiller(uid, { beneficiaireId: b.id });
    const nonLus = envois.filter((e) => e.status !== 'vu' && e.status !== 'repondu').length;
    if (envois.length) L.push(`Envois du conseiller : ${envois.length}, dont ${nonLus} pas encore ouverts.`);

    let tokens = 0;
    const text = await callMistral({
      prompt: L.join('\n').slice(0, 12000),
      systemInstruction: SYSTEM,
      isJson: false,
      temperature: 0.3,
      onUsage: ({ tokens: t }) => { tokens += Number(t) || 0; },
    });
    logEvent({ event: 'synthese-rdv', requestId, uid, status: 'ok', beneficiaireId: b.id, tokens });
    return NextResponse.json({ synthese: String(text || '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim() });
  } catch (err) {
    logEvent({ event: 'synthese-rdv', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: 'La synthèse n’a pas pu être préparée. Réessayez.' }, { status: 500 });
  }
}
