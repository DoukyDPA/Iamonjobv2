// ════════════════════════════════════════════════════════════════════════════
// Route API — POST /api/candidature/[candidatureId]/interview
//
// Génère une préparation d'entretien (5 questions) à partir des données
// stockées dans la fiche candidature. Sauvegarde en Firestore (cache).
//
// Si interviewPrep est déjà présent → retourne directement le cache.
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
  if (candidature.interviewPrep) {
    return NextResponse.json({ interviewPrep: candidature.interviewPrep, cached: true });
  }

  // ── Génération IA ────────────────────────────────────────────────────────
  try {
    const aiRequest = buildAIRequest({
      action: 'interview_prep_ft',
      params: {
        offer: candidature.offer,
        compatibility: candidature.compatibility,
      },
    });

    const raw = await callAI({
      task: aiRequest.task,
      prompt: aiRequest.prompt,
      systemInstruction: aiRequest.systemInstruction,
      isJson: true,
    });

    const interviewPrep = raw?.questions ? raw : { questions: [] };

    await updateCandidature(candidatureId, { interviewPrep });

    logEvent({ event: 'candidature-interview', requestId, uid, candidatureId, status: 'ok' });
    return NextResponse.json({ interviewPrep, cached: false });
  } catch (err) {
    logEvent({ event: 'candidature-interview', requestId, uid, candidatureId, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur génération.' }, { status: 500 });
  }
}
