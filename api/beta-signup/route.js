import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint public (pas d'auth) — utilisable depuis la landing Next.js comme
// depuis la version HTML autonome hébergée ailleurs.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── Plafond d'inscriptions ─────────────────────────────────────────────
// Pour relever (ou rouvrir) le test, change la variable d'environnement
// BETA_SIGNUP_MAX. Pas de redéploiement de code nécessaire.
const MAX_SIGNUPS = parseInt(process.env.BETA_SIGNUP_MAX || '100', 10);

async function getSignupCount() {
  // Agrégation côté serveur Firestore : ne télécharge pas les documents,
  // renvoie juste le compteur — opération économique même à grande échelle.
  const snap = await adminDb.collection('beta_signups').count().get();
  return snap.data().count;
}

const trim = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET : statut d'ouverture du test (lu par les landings au chargement) ──
export async function GET() {
  try {
    const count = await getSignupCount();
    return NextResponse.json(
      {
        count,
        max: MAX_SIGNUPS,
        remaining: Math.max(0, MAX_SIGNUPS - count),
        full: count >= MAX_SIGNUPS,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    // En cas de pépin sur le compteur, on renvoie un état neutre — la landing
    // affichera le formulaire et le POST refusera lui-même si nécessaire.
    console.warn('[beta-signup] GET count échoué :', err.message);
    return NextResponse.json(
      { count: null, max: MAX_SIGNUPS, remaining: null, full: false },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Requête invalide.' },
      { status: 400, headers: corsHeaders }
    );
  }

  // ─── Validation côté serveur ───────────────────────────────────────────
  const name      = trim(body.name, 120);
  const email     = trim(body.email, 200).toLowerCase();
  const phone     = trim(body.phone, 40);
  const situation = trim(body.situation, 2000);
  const heardFrom = trim(body.heardFrom, 120);
  const consent   = Boolean(body.consent);
  // Honeypot anti-bot : champ caché côté front, doit rester vide.
  const honeypot    = trim(body.website, 200);

  if (honeypot) {
    // On simule un succès pour ne pas révéler le honeypot.
    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  }
  if (!name || !email || !situation) {
    return NextResponse.json(
      { error: 'Merci de renseigner au minimum votre nom, votre email et votre situation.' },
      { status: 400, headers: corsHeaders }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "L'adresse email ne semble pas valide." },
      { status: 400, headers: corsHeaders }
    );
  }
  if (!consent) {
    return NextResponse.json(
      { error: 'Le consentement au traitement des données est requis.' },
      { status: 400, headers: corsHeaders }
    );
  }

  // ─── Vérification du quota AVANT écriture ──────────────────────────────
  // Note : pas de transaction, donc 2-3 inscriptions simultanées peuvent
  // dépasser légèrement le seuil. À l'échelle visée (100 testeurs) c'est
  // sans conséquence.
  try {
    const count = await getSignupCount();
    if (count >= MAX_SIGNUPS) {
      return NextResponse.json(
        {
          full: true,
          error:
            `Les inscriptions au test sont actuellement closes (${MAX_SIGNUPS} testeurs déjà inscrits). ` +
            "Une nouvelle vague ouvrira prochainement — écrivez-nous à contact@cbe-sud94.org pour être prévenu(e).",
        },
        { status: 409, headers: corsHeaders }
      );
    }
  } catch (err) {
    // Si le compteur échoue, on laisse passer plutôt que de bloquer un
    // testeur pour un problème interne.
    console.warn('[beta-signup] Comptage échoué, on laisse passer :', err.message);
  }

  // ─── Enregistrement Firestore ──────────────────────────────────────────
  try {
    await adminDb.collection('beta_signups').add({
      name,
      email,
      phone,
      situation,
      heardFrom,
      consent,
      createdAt: FieldValue.serverTimestamp(),
      source: trim(request.headers.get('referer') || '', 500),
      userAgent: trim(request.headers.get('user-agent') || '', 500),
    });
    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[beta-signup] Erreur enregistrement :', err);
    return NextResponse.json(
      {
        error:
          "Impossible d'enregistrer votre inscription pour le moment. Réessayez d'ici quelques minutes ou écrivez-nous à contact@cbe-sud94.org.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
