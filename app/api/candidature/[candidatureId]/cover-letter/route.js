// ════════════════════════════════════════════════════════════════════════════
// Route API — POST /api/candidature/[candidatureId]/cover-letter
//
// Génère une lettre de motivation à partir des données stockées dans la fiche
// candidature (offer + compatibility). Sauvegarde le résultat dans Firestore
// pour éviter de regénérer à chaque visite (cache Firestore).
//
// Si coverLetter est déjà présent → retourne directement le cache.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getCandidatureById, updateCandidature } from '@/lib/candidature';
import { callAI } from '@/lib/ai';
import { buildAIRequest } from '@/lib/ai/prompts';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticate(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) return { uid: null, error: 'Non authentifié.', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { uid: null, error: 'Session invalide.', status: 401 };
  }
}

export async function POST(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { candidatureId } = params;
  const requestId = newRequestId();

  const candidature = await getCandidatureById(candidatureId, uid);
  if (!candidature) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  // ── Cache Firestore ──────────────────────────────────────────────────────
  if (candidature.coverLetter) {
    return NextResponse.json({ coverLetter: candidature.coverLetter, cached: true });
  }

  // ── Génération IA ────────────────────────────────────────────────────────
  try {
    const aiRequest = buildAIRequest({
      action: 'cover_letter_ft',
      params: {
        offer: candidature.offer,
        compatibility: candidature.compatibility,
      },
    });

    const coverLetter = await callAI({
      task: aiRequest.task,
      prompt: aiRequest.prompt,
      systemInstruction: aiRequest.systemInstruction,
      isJson: false,
    });

    await updateCandidature(candidatureId, { coverLetter });

    logEvent({ event: 'candidature-cover-letter', requestId, uid, candidatureId, status: 'ok' });
    return NextResponse.json({ coverLetter, cached: false });
  } catch (err) {
    logEvent({ event: 'candidature-cover-letter', requestId, uid, candidatureId, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur génération.' }, { status: 500 });
  }
}
