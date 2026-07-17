import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { deleteAccountData } from '@/lib/account-deletion';
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
    // Effacement complet (CV, compteurs, compte Auth) via la logique partagée.
    await deleteAccountData(uid);

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
