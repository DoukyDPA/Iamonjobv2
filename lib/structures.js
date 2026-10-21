// ════════════════════════════════════════════════════════════════════════════
// Structures et responsables de structure.
//
// Un responsable gère son équipe depuis l'interface, sans informaticien :
// inviter un conseiller par son e-mail, retirer un accès au départ d'un
// salarié, réattribuer ses dossiers à un collègue.
//
//   structures/{structureId}
//     nom            nom affiché
//     responsables   e-mails des responsables
//     invitations    e-mails invités, pas encore inscrits
//     retires        e-mails dont l'accès a été retiré (bloqués même si leur
//                    domaine figure dans CONSEILLER_DOMAINS)
//
// Amorçage : RESPONSABLE_EMAILS (variable d'environnement, e-mails séparés
// par des virgules) désigne les premiers responsables de la structure par
// défaut. Ils peuvent ensuite en nommer d'autres.
// ════════════════════════════════════════════════════════════════════════════

import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import { transferBeneficiaire } from '@/lib/beneficiaires';
import { sendEmail } from '@/lib/mailer';

const COL = 'structures';
const lower = (e) => String(e || '').trim().toLowerCase();
const envList = (v) => String(v || '').split(',').map(lower).filter(Boolean);
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lower(e));

export async function getStructure(structureId) {
  const snap = await adminDb.doc(`${COL}/${structureId || 'default'}`).get();
  const d = snap.exists ? snap.data() : {};
  return {
    id: structureId || 'default',
    nom: d.nom || '',
    responsables: Array.isArray(d.responsables) ? d.responsables : [],
    invitations: Array.isArray(d.invitations) ? d.invitations : [],
    retires: Array.isArray(d.retires) ? d.retires : [],
  };
}

/** Responsable : e-mail listé dans la structure, ou amorçage par variable. */
export async function isResponsable({ email, structureId }) {
  const e = lower(email);
  if (!e) return false;
  if ((structureId || 'default') === 'default' && envList(process.env.RESPONSABLE_EMAILS).includes(e)) return true;
  const s = await getStructure(structureId);
  return s.responsables.map(lower).includes(e);
}

/** Invitation en attente pour cet e-mail ? Renvoie l'id de structure. */
export async function findInvitation(email) {
  const e = lower(email);
  if (!e) return null;
  const snap = await adminDb.collection(COL).where('invitations', 'array-contains', e).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/** Accès retiré pour cet e-mail dans une structure ? */
export async function isRetire(email) {
  const e = lower(email);
  if (!e) return false;
  const snap = await adminDb.collection(COL).where('retires', 'array-contains', e).limit(1).get();
  return !snap.empty;
}

/** Une fois inscrit, l'invité quitte la liste des invitations. */
export async function consumeInvitation(structureId, email) {
  await adminDb.doc(`${COL}/${structureId}`).set({ invitations: FieldValue.arrayRemove(lower(email)) }, { merge: true });
}

/** Équipe : conseillers de la structure, avec leur nombre de dossiers. */
export async function listEquipe(structureId) {
  const sid = structureId || 'default';
  const [cons, bens, s] = await Promise.all([
    adminDb.collection('conseillers').where('structureId', '==', sid).limit(300).get(),
    adminDb.collection('beneficiaires').where('structureId', '==', sid).select('conseillerUid').limit(5000).get(),
    getStructure(sid),
  ]);
  const count = new Map();
  for (const d of bens.docs) {
    const u = d.data().conseillerUid;
    count.set(u, (count.get(u) || 0) + 1);
  }
  const responsables = new Set([...s.responsables.map(lower), ...(sid === 'default' ? envList(process.env.RESPONSABLE_EMAILS) : [])]);
  const membres = cons.docs
    .filter((d) => d.data().role === 'conseiller')
    .map((d) => {
      const v = d.data();
      return {
        uid: d.id,
        email: v.email || '',
        prenom: v.prenom || '',
        lastSeenAt: v.lastSeenAt?.toMillis?.() ?? null,
        dossiers: count.get(d.id) || 0,
        responsable: responsables.has(lower(v.email)),
      };
    })
    .sort((a, b) => (a.prenom || a.email).localeCompare(b.prenom || b.email, 'fr'));
  return { structure: s, membres };
}

export async function inviter({ structureId, email, parEmail }) {
  const e = lower(email);
  if (!isEmail(e)) throw Object.assign(new Error('Adresse e-mail invalide.'), { status: 400 });
  await adminDb.doc(`${COL}/${structureId}`).set({
    invitations: FieldValue.arrayUnion(e),
    retires: FieldValue.arrayRemove(e),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const base = String(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  sendEmail({
    to: e,
    subject: 'IAMONJOB : vous êtes invité comme conseiller',
    text: [
      'Bonjour,',
      '',
      `${parEmail || 'Votre responsable'} vous invite à rejoindre son équipe sur IAMONJOB, l'outil d'accompagnement vers l'emploi.`,
      '',
      `Pour créer votre accès : ${base ? `${base}/conseiller/connexion` : '/conseiller/connexion'}`,
      `Utilisez cette adresse e-mail (${e}) et choisissez votre mot de passe.`,
      '',
      'IAMONJOB',
    ].join('\n'),
  }).catch(() => {});
}

export async function annulerInvitation({ structureId, email }) {
  await adminDb.doc(`${COL}/${structureId}`).set({ invitations: FieldValue.arrayRemove(lower(email)) }, { merge: true });
}

export async function nommerResponsable({ structureId, email, oui }) {
  await adminDb.doc(`${COL}/${structureId}`).set({
    responsables: oui ? FieldValue.arrayUnion(lower(email)) : FieldValue.arrayRemove(lower(email)),
  }, { merge: true });
}

/** Réattribue tous les dossiers d'un conseiller à un collègue de la structure. */
export async function reattribuer({ structureId, fromUid, toUid }) {
  const snap = await adminDb.collection('beneficiaires').where('conseillerUid', '==', fromUid).limit(1000).get();
  let n = 0;
  for (const d of snap.docs) {
    if ((d.data().structureId || 'default') !== structureId) continue;
    await transferBeneficiaire({ beneficiaireId: d.id, fromUid, toUid, structureId, notify: false });
    n++;
  }
  return n;
}

/**
 * Retire l'accès d'un conseiller (départ) : ses dossiers passent d'abord à un
 * collègue, puis son rôle est retiré et ses sessions coupées. Son e-mail est
 * bloqué, même si son domaine reste autorisé.
 */
export async function retirerAcces({ structureId, uid, versUid }) {
  const cons = await adminDb.doc(`conseillers/${uid}`).get();
  if (!cons.exists || (cons.data().structureId || 'default') !== structureId) {
    throw Object.assign(new Error("Ce conseiller n'appartient pas à votre structure."), { status: 400 });
  }
  const restants = await adminDb.collection('beneficiaires').where('conseillerUid', '==', uid).limit(1).get();
  let moved = 0;
  if (!restants.empty) {
    if (!versUid) throw Object.assign(new Error('Choisissez le collègue qui reprend ses dossiers.'), { status: 400 });
    moved = await reattribuer({ structureId, fromUid: uid, toUid: versUid });
  }
  const email = lower(cons.data().email);
  try {
    await adminAuth.setCustomUserClaims(uid, null);
    await adminAuth.revokeRefreshTokens(uid);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  await adminDb.doc(`conseillers/${uid}`).set({ role: 'retire', retireLe: FieldValue.serverTimestamp() }, { merge: true });
  if (email) {
    await adminDb.doc(`${COL}/${structureId}`).set({
      retires: FieldValue.arrayUnion(email),
      responsables: FieldValue.arrayRemove(email),
      invitations: FieldValue.arrayRemove(email),
    }, { merge: true });
  }
  return { moved };
}
