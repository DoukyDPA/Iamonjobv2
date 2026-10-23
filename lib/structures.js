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
//
// Plusieurs structures : ADMIN_EMAILS désigne les administrateurs de la
// plateforme. Depuis l'onglet « Structures », ils créent une structure et y
// nomment un ou plusieurs responsables, qui invitent ensuite leurs conseillers.
// Un administrateur est aussi responsable de sa propre structure.
// ════════════════════════════════════════════════════════════════════════════

import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import { transferBeneficiaire } from '@/lib/beneficiaires';
import { sendEmail } from '@/lib/mailer';
import { conseillerStructureId } from '@/lib/conseiller-allowlist';

const COL = 'structures';
const lower = (e) => String(e || '').trim().toLowerCase();
const envList = (v) => String(v || '').split(',').map(lower).filter(Boolean);
// RESPONSABLE_EMAILS vaut pour la structure par défaut, quel que soit son nom
// (« default », ou la valeur de CONSEILLER_DEFAULT_STRUCTURE).
const estParDefaut = (sid) => ['default', conseillerStructureId()].includes(sid || 'default');
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

/** Administrateur de la plateforme (variable ADMIN_EMAILS). */
export function isPlatformAdmin(email) {
  const e = lower(email);
  return Boolean(e) && envList(process.env.ADMIN_EMAILS).includes(e);
}

/** Responsable désigné par la variable RESPONSABLE_EMAILS. */
export function isResponsableEnv(email) {
  const e = lower(email);
  return Boolean(e) && envList(process.env.RESPONSABLE_EMAILS).includes(e);
}

/** Responsable : e-mail listé dans la structure, ou amorçage par variable. */
export async function isResponsable({ email, structureId }) {
  const e = lower(email);
  if (!e) return false;
  if (isPlatformAdmin(e)) return true;
  if (estParDefaut(structureId) && envList(process.env.RESPONSABLE_EMAILS).includes(e)) return true;
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
  const responsables = new Set([...s.responsables.map(lower), ...(estParDefaut(sid) ? envList(process.env.RESPONSABLE_EMAILS) : [])]);
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

export async function inviter({ structureId, email, parEmail, responsable = false, nomStructure = '' }) {
  const e = lower(email);
  if (!isEmail(e)) throw Object.assign(new Error('Adresse e-mail invalide.'), { status: 400 });
  await adminDb.doc(`${COL}/${structureId}`).set({
    invitations: FieldValue.arrayUnion(e),
    retires: FieldValue.arrayRemove(e),
    ...(responsable ? { responsables: FieldValue.arrayUnion(e) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  // Lien absolu : sans NEXT_PUBLIC_SITE_URL, on retombe sur l'adresse publique.
  const base = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.iamonjob.ai').replace(/\/+$/, '');
  const chez = nomStructure ? ` (${nomStructure})` : '';
  // On attend l'envoi pour dire la vérité à l'écran : si Resend refuse,
  // l'invitation reste valable, mais il faut prévenir la personne autrement.
  return sendEmail({
    to: e,
    subject: responsable ? 'IAMONJOB : vous êtes nommé responsable de structure' : 'IAMONJOB : vous êtes invité comme conseiller',
    text: [
      'Bonjour,',
      '',
      responsable
        ? `${parEmail || "L'administrateur"} vous nomme responsable de votre structure${chez} sur IAMONJOB, l'outil d'accompagnement vers l'emploi. Une fois votre accès créé, l'onglet « Équipe » vous permet d'inviter vos conseillers.`
        : `${parEmail || 'Votre responsable'} vous invite à rejoindre son équipe${chez} sur IAMONJOB, l'outil d'accompagnement vers l'emploi.`,
      '',
      `Pour créer votre accès : ${base ? `${base}/conseiller/connexion` : '/conseiller/connexion'}`,
      `Utilisez cette adresse e-mail (${e}) et choisissez votre mot de passe.`,
      '',
      'IAMONJOB',
    ].join('\n'),
  }).then(() => ({ emailEnvoye: true })).catch((err) => {
    console.error(JSON.stringify({ ts: new Date().toISOString(), event: 'invitation-email', status: 'error', error: err.message }));
    return { emailEnvoye: false, raisonEmail: err.message };
  });
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

// ── Administration de la plateforme : plusieurs structures ──────────────────

const slug = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Toutes les structures, avec leurs responsables et quelques chiffres. */
export async function listStructures() {
  const snap = await adminDb.collection(COL).limit(200).get();
  const ids = new Set(snap.docs.map((d) => d.id));
  // La structure par défaut existe même sans document.
  ids.add(process.env.CONSEILLER_DEFAULT_STRUCTURE || 'default');
  const out = [];
  for (const id of ids) {
    const s = await getStructure(id);
    const [cons, bens] = await Promise.all([
      // Un seul filtre : évite d'exiger un index composite dans Firestore.
      adminDb.collection('conseillers').where('structureId', '==', id).select('role').limit(500).get()
        .then((q) => ({ data: () => ({ count: q.docs.filter((d) => d.data().role === 'conseiller').length }) })).catch(() => null),
      adminDb.collection('beneficiaires').where('structureId', '==', id).count().get().catch(() => null),
    ]);
    const responsables = new Set(s.responsables.map(lower));
    if (estParDefaut(id)) envList(process.env.RESPONSABLE_EMAILS).forEach((e) => responsables.add(e));
    out.push({
      id,
      nom: s.nom || (id === 'default' ? 'Structure par défaut' : id),
      responsables: [...responsables],
      invitations: s.invitations,
      conseillers: cons?.data().count ?? null,
      beneficiaires: bens?.data().count ?? null,
    });
  }
  return out.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Crée une structure à partir de son nom. Renvoie son identifiant. */
export async function creerStructure({ nom }) {
  const n = String(nom || '').trim();
  const id = slug(n);
  if (!id) throw Object.assign(new Error('Donnez un nom à la structure.'), { status: 400 });
  const ref = adminDb.doc(`${COL}/${id}`);
  if ((await ref.get()).exists) throw Object.assign(new Error('Une structure porte déjà ce nom.'), { status: 409 });
  await ref.set({ nom: n, responsables: [], invitations: [], retires: [], createdAt: FieldValue.serverTimestamp() });
  return id;
}

export async function renommerStructure({ structureId, nom }) {
  const n = String(nom || '').trim();
  if (!n) throw Object.assign(new Error('Nom vide.'), { status: 400 });
  await adminDb.doc(`${COL}/${structureId}`).set({ nom: n }, { merge: true });
}

/**
 * Nomme un responsable dans une structure. S'il a déjà un compte conseiller
 * (dans cette structure), il devient responsable tout de suite ; sinon il
 * reçoit une invitation qui le rattache à cette structure à son inscription.
 */
export async function nommerResponsableStructure({ structureId, email, parEmail }) {
  const e = lower(email);
  if (!isEmail(e)) throw Object.assign(new Error('Adresse e-mail invalide.'), { status: 400 });
  const s = await getStructure(structureId);
  let existant = null;
  try { existant = await adminAuth.getUserByEmail(e); } catch { /* pas encore de compte */ }
  const claims = existant?.customClaims || {};
  if (existant && claims.role === 'conseiller') {
    if ((claims.structureId || 'default') !== structureId) {
      throw Object.assign(new Error(`Cette adresse est déjà conseiller dans une autre structure (${claims.structureId || 'default'}).`), { status: 409 });
    }
    await nommerResponsable({ structureId, email: e, oui: true });
    return { invite: false };
  }
  const envoi = await inviter({ structureId, email: e, parEmail, responsable: true, nomStructure: s.nom });
  return { invite: true, ...envoi };
}
