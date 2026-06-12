import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════════════════
// Suppression de compte — droit à l'effacement (RGPD, article 17).
//
// Effacement TOTAL et définitif : on supprime le document CV, les compteurs de
// rate limit, puis le compte Firebase Auth. La session est invalidée dans la
// foulée. Action irréversible, déclenchée par l'utilisateur lui-même.
// ════════════════════════════════════════════════════════════════════════════

export async function POST(request) {
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
    // 1. Données applicatives. On efface ce qui existe ; l'absence n'est pas une
    //    erreur (delete sur un doc inexistant ne lève rien côté Admin SDK).
    await adminDb.doc(`cvs/${uid}`).delete();
    await adminDb.doc(`rate_limits/ai__${uid}`).delete();
    await adminDb.doc(`rate_limits/france-travail__${uid}`).delete();

    // 2. Compte d'authentification.
    await adminAuth.deleteUser(uid);

    // Trace d'audit : on journalise l'uid effacé, jamais email ni nom.
    logEvent({ event: 'account-delete', requestId, uid, status: 'deleted' });

    // 3. On invalide la session côté navigateur.
    const response = NextResponse.json({ ok: true });
    response.cookies.delete('__session');
    return response;
  } catch (err) {
    logEvent({
      event: 'account-delete', requestId, uid, status: 'error',
      error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: "La suppression a échoué. Réessayez ou écrivez-nous à contact@cbe-sud94.org." },
      { status: 500 }
    );
  }
}
