// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/activation  (publique)
//
// Première connexion d'un bénéficiaire par code. La personne fournit son code,
// choisit un mot de passe et valide son consentement. On crée alors son compte
// Firebase (email interne dérivé du code), on pose son rôle, on marque le
// bénéficiaire actif et on enregistre le consentement.
//
// Un code ne s'active qu'une fois. Le suffixe aléatoire du code plus une
// limitation de débit protègent contre les tentatives de devinette.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getBeneficiaireByCode, markBeneficiaireActive } from '@/lib/beneficiaires';
import { recordConsent } from '@/lib/consent';
import { codeToEmail, normalizeCode, isPlausibleCode } from '@/lib/beneficiaire-auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const requestId = newRequestId();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const code = normalizeCode(body.code);
  const password = String(body.password || '');
  const consent = body.consent === true;

  // Validations de base.
  if (!isPlausibleCode(code)) {
    return NextResponse.json({ error: 'Code non reconnu. Vérifiez la saisie.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: 'Votre accord est nécessaire pour activer le compte.' }, { status: 400 });
  }

  // Limitation de débit par code : freine la devinette de codes.
  const rl = await enforceRateLimit({ uid: `activation_${code}`, route: 'activation', perMinute: 5, perDay: 20 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  try {
    const ben = await getBeneficiaireByCode(code);
    if (!ben) {
      logEvent({ event: 'activation', requestId, status: 'unknown-code' });
      return NextResponse.json({ error: 'Code inconnu. Rapprochez-vous de votre conseiller.' }, { status: 404 });
    }
    if (ben.status === 'active') {
      return NextResponse.json(
        { error: 'Ce code est déjà activé. Utilisez la page de connexion avec votre mot de passe.' },
        { status: 409 }
      );
    }

    // Création du compte Firebase (email interne dérivé du code).
    let authUid;
    try {
      const user = await adminAuth.createUser({ email: codeToEmail(code), password });
      authUid = user.uid;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Ce code est déjà activé. Utilisez la page de connexion.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // Rôle bénéficiaire + rattachements dans le token.
    await adminAuth.setCustomUserClaims(authUid, {
      role: 'beneficiaire',
      beneficiaireId: ben.id,
      structureId: ben.structureId || 'default',
    });

    // Bénéficiaire actif + consentement tracé.
    await markBeneficiaireActive({ beneficiaireId: ben.id, authUid });
    await recordConsent({ beneficiaireId: ben.id, authUid });

    logEvent({ event: 'activation', requestId, uid: authUid, status: 'ok' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'activation', requestId, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: "L'activation a échoué. Réessayez." }, { status: 500 });
  }
}
