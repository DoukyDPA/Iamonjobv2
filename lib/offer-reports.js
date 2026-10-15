// ════════════════════════════════════════════════════════════════════════════
// Signalements « Hors sujet » — modèle serveur (Admin SDK uniquement).
//
// Un candidat qui signale une offre la masque POUR LUI SEUL, tout de suite.
// L'exclusion pour tout le monde exige une validation humaine : un conseiller
// confirme dans son tableau de bord, ou signale lui-même (son signalement vaut
// validation). Un candidat seul ne peut donc pas polluer les résultats des
// autres en jugeant une offre sur son titre.
//
// L'exclusion vaut pour UN métier : une offre hors sujet pour « médiateur
// culturel » peut être parfaite pour un autre métier.
//
// Structure Firestore : offerReports/{metierKey__offerId}
//   metierKey      racines distinctives de la recherche, triées (« cultur medi »)
//                  → « Médiateur culturel » et « Médiatrice culturelle » se
//                    rejoignent
//   metier         libellé tel que cherché (premier signalement)
//   codeRome       ROME du métier cherché, s'il est connu
//   offer          { id, intitule, entreprise, lieu, source, url, codeRome }
//   reporterUids   comptes ayant signalé (masquage individuel)
//   reportCount    nombre de signalements
//   status         'pending' | 'excluded' | 'kept'
//   decidedBy, decidedAt, createdAt, updatedAt
//
// Accès client : aucun. Tout passe par /api/offer-report et
// /api/conseiller/offer-reports.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { distinctiveStems, norm } from '@/lib/relevance';

const COL = 'offerReports';

// Clé de métier stable : les racines distinctives, triées. À défaut (requête
// toute générique), le libellé normalisé.
export function metierKeyOf(keywords) {
  const stems = distinctiveStems(keywords || '').sort();
  const key = stems.length ? stems.join(' ') : norm(keywords).replace(/[^a-z0-9]+/g, ' ').trim();
  return key.slice(0, 80);
}

function docIdOf(metierKey, offerId) {
  const safe = (s) => String(s).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120);
  return `${safe(metierKey)}__${safe(offerId)}`;
}

function trimOffer(o = {}) {
  return {
    id: String(o.id || '').slice(0, 200),
    intitule: String(o.intitule || 'Offre').slice(0, 200),
    entreprise: String(o.entreprise || '').slice(0, 120),
    lieu: String(o.lieu || '').slice(0, 120),
    source: o.source ? String(o.source).slice(0, 40) : null,
    url: o.url ? String(o.url).slice(0, 500) : null,
    codeRome: o.codeRome ? String(o.codeRome).slice(0, 10) : null,
  };
}

/**
 * Enregistre un signalement. Un conseiller exclut directement.
 * @returns {Promise<{ status: string }>}
 */
export async function reportOffer({ uid, role, metier, codeRome, offer }) {
  const clean = trimOffer(offer);
  if (!clean.id) throw new Error('Offre sans identifiant.');
  const metierKey = metierKeyOf(metier);
  if (!metierKey) throw new Error('Métier manquant.');

  const ref = adminDb.doc(`${COL}/${docIdOf(metierKey, clean.id)}`);
  const isConseiller = role === 'conseiller';

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = FieldValue.serverTimestamp();
    if (!snap.exists) {
      const status = isConseiller ? 'excluded' : 'pending';
      tx.set(ref, {
        metierKey,
        metier: String(metier || '').slice(0, 120),
        codeRome: codeRome ? String(codeRome).slice(0, 10) : null,
        offer: clean,
        reporterUids: [uid],
        reportCount: 1,
        status,
        decidedBy: isConseiller ? uid : null,
        decidedAt: isConseiller ? now : null,
        createdAt: now,
        updatedAt: now,
      });
      return { status };
    }
    const data = snap.data();
    if ((data.reporterUids || []).includes(uid)) return { status: data.status };
    const patch = {
      reporterUids: FieldValue.arrayUnion(uid),
      reportCount: FieldValue.increment(1),
      updatedAt: now,
    };
    // Un conseiller tranche, même si l'offre avait été gardée auparavant.
    if (isConseiller) Object.assign(patch, { status: 'excluded', decidedBy: uid, decidedAt: now });
    tx.update(ref, patch);
    return { status: isConseiller ? 'excluded' : data.status };
  });
}

/**
 * Identifiants d'offres à masquer pour cette recherche et cet utilisateur :
 * exclusions validées pour le métier + ses propres signalements.
 * Ne lève jamais : en cas de souci, on ne masque rien.
 * @returns {Promise<Set<string>>}
 */
export async function getHiddenOfferIds({ uid, keywords }) {
  const hidden = new Set();
  const metierKey = metierKeyOf(keywords);
  if (!metierKey) return hidden;
  try {
    const snap = await adminDb.collection(COL).where('metierKey', '==', metierKey).get();
    snap.forEach((d) => {
      const r = d.data();
      if (r.status === 'excluded' || (uid && (r.reporterUids || []).includes(uid))) {
        hidden.add(r.offer?.id);
      }
    });
  } catch (err) {
    console.warn('[OfferReports] Lecture des exclusions impossible :', err.message);
  }
  return hidden;
}

// Liste pour le tableau de bord conseiller. Pas d'orderBy côté Firestore (évite
// un index composite) : on trie ici, le volume reste modeste.
export async function listOfferReports({ status = 'pending', max = 300 } = {}) {
  const snap = await adminDb.collection(COL).where('status', '==', status).limit(max).get();
  const rows = snap.docs.map((d) => {
    const r = d.data();
    return {
      id: d.id,
      metier: r.metier,
      metierKey: r.metierKey,
      codeRome: r.codeRome || null,
      offer: r.offer,
      reportCount: r.reportCount || 0,
      status: r.status,
      updatedAt: r.updatedAt?.toMillis?.() || null,
    };
  });
  return rows.sort((a, b) => b.reportCount - a.reportCount || (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Décision d'un conseiller : 'excluded' (hors sujet pour tous) ou 'kept'
 * (l'offre est pertinente ; elle reste masquée pour ceux qui l'ont signalée).
 */
export async function decideOfferReport({ id, decision, uid }) {
  if (!['excluded', 'kept', 'pending'].includes(decision)) throw new Error('Décision invalide.');
  const ref = adminDb.doc(`${COL}/${String(id).slice(0, 300)}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Signalement introuvable.');
  await ref.update({
    status: decision,
    decidedBy: decision === 'pending' ? null : uid,
    decidedAt: decision === 'pending' ? null : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id, status: decision };
}
