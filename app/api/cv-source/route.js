// Passerelle IAMONJOB → IAMONCV : renvoie le texte du CV que la personne a
// chargé (et anonymisé) à l'étape 1 d'IAMONJOB, pour qu'IAMONCV puisse
// pré-remplir sa base de données au lieu de repartir de zéro.
//
// Lecture seule, uniquement sur le document de l'utilisateur connecté
// (cvs/{uid}). Par précaution, on masque encore les e-mails et numéros de
// téléphone qui auraient échappé à l'anonymisation : IAMONCV n'envoie jamais
// les coordonnées à l'IA, la personne les saisit à la fin, sur le CV.

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Numéros français (06 12 34 56 78, +33 6 12 34 56 78, 06.12.34.56.78…)
const PHONE_RE = /(?:\+33\s?|0033\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g;

function scrub(text) {
  return String(text || '')
    .replace(EMAIL_RE, '[retiré]')
    .replace(PHONE_RE, '[retiré]');
}

export async function GET(request) {
  const requestId = newRequestId();

  const token = request.cookies.get('__session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection('cvs').doc(uid).get();
    const data = snap.exists ? snap.data() : null;
    const cvText = (data?.cvText || '').trim();

    logEvent({ event: 'cv-source', requestId, uid, status: cvText ? 'ok' : 'empty' });

    if (!cvText) {
      return NextResponse.json({ cvText: '' });
    }

    const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null;
    return NextResponse.json(
      { cvText: scrub(cvText), updatedAt },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    logEvent({ event: 'cv-source', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: 'Lecture du CV impossible.' }, { status: 500 });
  }
}
