import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { callAI, availableProviders } from '@/lib/ai';
import { buildAIRequest } from '@/lib/ai/prompts';
import { enforceRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Plafonds par utilisateur (modifiables via variables d'environnement).
const AI_PER_MINUTE = parseInt(process.env.AI_RATE_PER_MINUTE || '15', 10);
const AI_PER_DAY = parseInt(process.env.AI_RATE_PER_DAY || '200', 10);

export async function GET() {
  return NextResponse.json({ providers: availableProviders() });
}

export async function POST(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  // Vérification du token ET récupération de l'uid (pour le rate limiting).
  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  // ─── Limitation de débit par utilisateur ───────────────────────────────
  const limit = await enforceRateLimit({
    uid,
    route: 'ai',
    perMinute: AI_PER_MINUTE,
    perDay: AI_PER_DAY,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          limit.scope === 'day'
            ? 'Quota quotidien atteint. Réessayez demain.'
            : 'Trop de requêtes. Patientez un instant avant de réessayer.',
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 60) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  // Le client choisit une ACTION et fournit des DONNÉES. Il ne contrôle plus
  // l'instruction système : celle-ci est construite côté serveur (lib/ai/prompts).
  const { provider, action, params } = body;
  if (!action) {
    return NextResponse.json({ error: 'Le champ action est requis.' }, { status: 400 });
  }

  let aiRequest;
  try {
    aiRequest = buildAIRequest({ action, params });
  } catch {
    return NextResponse.json({ error: 'Action IA non autorisée.' }, { status: 400 });
  }

  try {
    const result = await callAI({
      provider,
      task: aiRequest.task,
      prompt: aiRequest.prompt,
      systemInstruction: aiRequest.systemInstruction,
      isJson: aiRequest.isJson,
    });
    return NextResponse.json({ result });
  } catch (err) {
    console.error('Erreur API IA :', err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'appel à l'IA." },
      { status: 500 }
    );
  }
}
