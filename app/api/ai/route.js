import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { callAI, availableProviders } from '@/lib/ai';
import { normalizeSuggestionsToRome, fetchFicheRome } from '@/lib/france-travail';
import { buildAIRequest } from '@/lib/ai/prompts';
import { validateAIResult } from '@/lib/ai/validate';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { recordUsage } from '@/lib/usage';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Plafonds par utilisateur (modifiables via variables d'environnement).
const AI_PER_MINUTE = parseInt(process.env.AI_RATE_PER_MINUTE || '15', 10);
const AI_PER_DAY = parseInt(process.env.AI_RATE_PER_DAY || '200', 10);

export async function GET() {
  return NextResponse.json({ providers: availableProviders() });
}

export async function POST(request) {
  const requestId = newRequestId();
  const startedAt = Date.now();

  const token = request.cookies.get('__session')?.value;
  if (!token) {
    logEvent({ event: 'ai', requestId, status: 'unauthenticated', level: 'error' });
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  // Vérification du token ET récupération de l'uid (pour le rate limiting)
  // et du rôle (pour garantir un traitement européen aux bénéficiaires).
  let uid;
  let role = null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    role = decoded.role || null;
  } catch {
    logEvent({ event: 'ai', requestId, status: 'invalid_token', level: 'error' });
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  // ─── Corps de la requête ────────────────────────────────────────────────
  // Lu tôt (avant la limitation de débit) pour connaître le code ROME et lancer
  // le chargement de la fiche métier EN PARALLÈLE du rate-limit ci-dessous.
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

  // Enrichissement enquête métier : on ancre la découverte ET le chat sur la
  // fiche ROME officielle (compétences, savoirs) au lieu de laisser le modèle
  // tout inventer. La fiche est mise en cache (lib/france-travail), donc les
  // messages successifs du chat ne retapent pas l'API.
  // On DÉMARRE ici le chargement, en tâche de fond, pour qu'il se déroule pendant
  // la vérification de quota. Sa latence ne s'ajoute donc plus au temps de
  // génération perçu. Non bloquant : si le référentiel répond mal ou trop
  // lentement, la promesse retombe sur null et on poursuit sans la fiche.
  const fichePromise =
    (action === 'discover_job' || action === 'job_chat') && params?.codeRome
      ? fetchFicheRome(params.codeRome).catch((err) => {
          logEvent({
            event: 'ai', requestId, uid, action, status: 'rome_fiche_skipped',
            error: err.message, level: 'warn',
          });
          return null;
        })
      : null;

  // ─── Limitation de débit par utilisateur ───────────────────────────────
  // S'exécute pendant que la fiche ROME se charge (voir ci-dessus).
  const limit = await enforceRateLimit({
    uid,
    route: 'ai',
    perMinute: AI_PER_MINUTE,
    perDay: AI_PER_DAY,
  });
  if (!limit.allowed) {
    logEvent({ event: 'ai', requestId, uid, status: 'rate_limited', scope: limit.scope });
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

  // Bénéficiaire : traitement forcé sur Mistral (France), sans repli Google.
  // Garantie affichée à l'activation d'un traitement 100% européen du CV.
  const effectiveProvider = role === 'beneficiaire' ? 'mistral' : provider;

  // La fiche ROME est déjà en cours de chargement : on la récupère juste avant
  // de construire le prompt.
  let effectiveParams = params;
  if (fichePromise) {
    const fiche = await fichePromise;
    if (fiche) effectiveParams = { ...params, fiche };
  }

  let aiRequest;
  try {
    aiRequest = buildAIRequest({ action, params: effectiveParams });
  } catch {
    return NextResponse.json({ error: 'Action IA non autorisée.' }, { status: 400 });
  }

  // Suivi de coût : on cumule les tokens de l'appel. Le provider les remonte via
  // onUsage ; on somme ici, puis on enregistre une seule fois après succès.
  let tokensUsed = 0;
  let usageProvider = effectiveProvider || 'mistral';
  const onUsage = ({ provider: p, tokens }) => {
    tokensUsed += Number(tokens) || 0;
    if (p) usageProvider = p;
  };

  try {
    const result = await callAI({
      provider: effectiveProvider,
      task: aiRequest.task,
      prompt: aiRequest.prompt,
      systemInstruction: aiRequest.systemInstruction,
      isJson: aiRequest.isJson,
      onUsage,
    });

    // ─── Validation de la forme de la réponse (sorties JSON uniquement) ────
    if (aiRequest.isJson) {
      const { ok } = validateAIResult(action, result);
      if (!ok) {
        logEvent({
          event: 'ai', requestId, uid, action, provider: effectiveProvider || 'mistral',
          status: 'invalid_output', durationMs: Date.now() - startedAt, level: 'error',
        });
        return NextResponse.json(
          { error: "La réponse de l'IA est incomplète. Réessayez." },
          { status: 502 }
        );
      }
    }

    // Normalisation ROME des métiers suggérés : on cale chaque piste sur une
    // appellation officielle et on y attache le code ROME, clé de toute la chaîne.
    let finalResult = result;
    if (action === 'analyze_cv' && result?.suggestions) {
      try {
        const suggestions = await normalizeSuggestionsToRome(result.suggestions);
        finalResult = { ...result, suggestions };
      } catch (err) {
        // Non bloquant : on renvoie l'analyse telle quelle si la normalisation échoue.
        logEvent({
          event: 'ai', requestId, uid, action, status: 'rome_normalize_skipped',
          error: err.message, level: 'warn',
        });
      }
    }

    logEvent({
      event: 'ai', requestId, uid, action, provider: effectiveProvider || 'mistral',
      status: 'ok', durationMs: Date.now() - startedAt, tokens: tokensUsed,
    });

    // Comptabilisation des tokens par personne accompagnée, sans bloquer la
    // réponse. On ne suit que les dossiers rattachés à un conseiller ; un compte
    // libre (hors accompagnement) n'a pas de dossier et n'est donc pas suivi.
    if (tokensUsed > 0) {
      getBeneficiaireByAuthUid(uid)
        .then((ben) => ben && recordUsage({ beneficiaireId: ben.id, provider: usageProvider, tokens: tokensUsed }))
        .catch((err) => logEvent({ event: 'usage-record', requestId, uid, status: 'error', error: err.message, level: 'warn' }));
    }

    return NextResponse.json({ result: finalResult });
  } catch (err) {
    logEvent({
      event: 'ai', requestId, uid, action, provider: effectiveProvider || 'mistral',
      status: 'error', durationMs: Date.now() - startedAt,
      error: err.message, level: 'error',
    });
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'appel à l'IA." },
      { status: 500 }
    );
  }
}
