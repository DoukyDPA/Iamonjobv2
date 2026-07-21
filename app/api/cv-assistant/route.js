// Route dédiée à IAMONCV (assistant de rédaction de CV).
//
// IAMONCV envoie une instruction système et une requête libres, plus un
// historique de conversation. On ne peut donc pas passer par /api/ai, qui
// impose des actions fermées et construit lui-même l'instruction système. Cette
// route sert de proxy vers Mistral (France), avec la même authentification, le
// même rate-limiting et le même suivi de coût que le reste de l'application.
//
// Traitement 100% européen : on force Mistral, sans repli Google. C'est la même
// garantie que celle affichée aux bénéficiaires côté /api/ai.

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { fetchWithTimeout } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { recordUsage } from '@/lib/usage';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Plafonds par utilisateur (mêmes variables que /api/ai).
const AI_PER_MINUTE = parseInt(process.env.AI_RATE_PER_MINUTE || '15', 10);
const AI_PER_DAY = parseInt(process.env.AI_RATE_PER_DAY || '200', 10);

const LARGE_MODEL = 'mistral-large-latest';
const SMALL_MODEL = 'mistral-small-latest';
const LARGE_TIMEOUT_MS = 35000;
const SMALL_TIMEOUT_MS = 25000;

// Garde-fous de taille (caractères). La génération de CV embarque toute la base
// du profil dans la requête, d'où une limite large, alignée sur /api/ai.
const MAX_QUERY = 50000;
const MAX_SYS = 40000;
const MAX_HISTORY_MESSAGES = 40;

// Convertit l'historique au format Gemini ({ role, parts:[{text}] }) — utilisé
// par IAMONCV — en messages Mistral ({ role, content }). Un rôle « model »
// devient « assistant ».
function toMistralMessages(systemInstruction, history, query) {
  const messages = [{ role: 'system', content: String(systemInstruction || '') }];

  if (Array.isArray(history)) {
    for (const item of history.slice(-MAX_HISTORY_MESSAGES)) {
      if (!item) continue;
      let content = '';
      if (typeof item.content === 'string') {
        content = item.content;
      } else if (Array.isArray(item.parts)) {
        content = item.parts.map((p) => (p && p.text) || '').join('');
      }
      content = String(content).trim();
      if (!content) continue;
      const role = item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user';
      messages.push({ role, content: content.slice(0, MAX_QUERY) });
    }
  }

  messages.push({ role: 'user', content: query });
  return messages;
}

async function callMistralMessages({ messages, model, timeoutMs, apiKey }) {
  const response = await fetchWithTimeout(
    'https://api.mistral.ai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
    },
    timeoutMs
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const err = new Error(
      `Mistral API ${response.status} : ${errData.message || errData.error?.message || 'erreur inconnue'}`
    );
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    usage: data.usage || {},
  };
}

// Une erreur passagère (délai, 429, 5xx) mérite une nouvelle tentative. Une clé
// invalide (401) ou une requête malformée (400) non.
function isTransient(err) {
  if (!err) return false;
  if (/Délai dépassé/.test(err.message)) return true;
  if (err.status === 429) return true;
  if (err.status >= 500 && err.status <= 599) return true;
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
  const requestId = newRequestId();
  const startedAt = Date.now();

  // ─── Authentification (même mécanisme que /api/ai) ──────────────────────
  const token = request.cookies.get('__session')?.value;
  if (!token) {
    logEvent({ event: 'cv-assistant', requestId, status: 'unauthenticated', level: 'error' });
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    logEvent({ event: 'cv-assistant', requestId, status: 'invalid_token', level: 'error' });
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  // ─── Corps de la requête ────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { query, systemInstruction, history } = body || {};
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Le champ query est requis.' }, { status: 400 });
  }
  if (query.length > MAX_QUERY) {
    return NextResponse.json(
      { error: `Requête trop longue (${query.length} caractères, max ${MAX_QUERY}).` },
      { status: 400 }
    );
  }
  const safeSystem = typeof systemInstruction === 'string' ? systemInstruction.slice(0, MAX_SYS) : '';

  // ─── Limitation de débit par utilisateur ────────────────────────────────
  const limit = await enforceRateLimit({
    uid,
    route: 'cv-assistant',
    perMinute: AI_PER_MINUTE,
    perDay: AI_PER_DAY,
  });
  if (!limit.allowed) {
    logEvent({ event: 'cv-assistant', requestId, uid, status: 'rate_limited', scope: limit.scope });
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

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    logEvent({ event: 'cv-assistant', requestId, uid, status: 'no_key', level: 'error' });
    return NextResponse.json({ error: 'Service IA indisponible.' }, { status: 500 });
  }

  const messages = toMistralMessages(safeSystem, history, query);

  // ─── Appel Mistral avec repli (large → small), toujours en UE ───────────
  const attempts = [
    { model: LARGE_MODEL, timeoutMs: LARGE_TIMEOUT_MS },
    { model: SMALL_MODEL, timeoutMs: SMALL_TIMEOUT_MS },
  ];

  let result;
  let lastErr;
  for (let i = 0; i < attempts.length; i++) {
    try {
      result = await callMistralMessages({ messages, apiKey, ...attempts[i] });
      break;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts.length - 1) break;
      await sleep(500 * (i + 1));
    }
  }

  if (!result) {
    logEvent({
      event: 'cv-assistant', requestId, uid, status: 'error',
      durationMs: Date.now() - startedAt, error: lastErr?.message, level: 'error',
    });
    return NextResponse.json(
      { error: lastErr?.message || "Erreur lors de l'appel à l'IA." },
      { status: 500 }
    );
  }

  // ─── Suivi de coût (comme /api/ai), non bloquant ────────────────────────
  const totalTokens = result.usage.total_tokens ?? 0;
  if (totalTokens > 0) {
    getBeneficiaireByAuthUid(uid)
      .then((ben) => ben && recordUsage({ beneficiaireId: ben.id, provider: 'mistral', tokens: totalTokens }))
      .catch((err) =>
        logEvent({ event: 'usage-record', requestId, uid, status: 'error', error: err.message, level: 'warn' })
      );
  }

  logEvent({
    event: 'cv-assistant', requestId, uid, status: 'ok',
    durationMs: Date.now() - startedAt, tokens: totalTokens,
  });

  // On renvoie l'usage au format attendu par le compteur de tokens d'IAMONCV.
  return NextResponse.json({
    text: result.text,
    usage: {
      promptTokens: result.usage.prompt_tokens ?? 0,
      completionTokens: result.usage.completion_tokens ?? 0,
      totalTokens,
    },
  });
}
