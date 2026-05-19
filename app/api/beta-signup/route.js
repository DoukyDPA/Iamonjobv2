import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint public (pas d'auth) — utilisable depuis la landing Next.js comme
// depuis la version HTML autonome hébergée ailleurs.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const trim = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
