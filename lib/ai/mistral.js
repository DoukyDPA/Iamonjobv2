// Provider Mistral
// Doc : https://docs.mistral.ai/api/
//
// Résilience : Mistral Large peut être lent sur une analyse de CV. Comme les
// bénéficiaires sont traités exclusivement en Europe (pas de repli Google), on
// se donne ici plusieurs chances SANS quitter Mistral :
//   1. une tentative sur le modèle demandé, délai généreux ;
//   2. une seconde tentative identique si la première expire ou renvoie une
//      erreur serveur passagère ;
//   3. en dernier recours, un repli sur mistral-small (plus rapide, toujours UE).

import { fetchWithTimeout } from '@/lib/http';

export const MISTRAL_DEFAULT_MODEL = 'mistral-large-latest';
const MISTRAL_FALLBACK_MODEL = 'mistral-small-latest';

// Délais : franc sur le gros modèle, plus court sur le repli rapide. On borne le
// temps total d'attente (environ une minute au pire) pour ne pas laisser la
// personne devant un écran figé.
const LARGE_TIMEOUT_MS = 35000;
const SMALL_TIMEOUT_MS = 25000;

async function callOnce({ prompt, systemInstruction, isJson, model, apiKey, timeoutMs }) {
  const payload = {
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  };
  if (isJson) payload.response_format = { type: 'json_object' };

  const response = await fetchWithTimeout(
    'https://api.mistral.ai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
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
  return data.choices?.[0]?.message?.content ?? '';
}

// Une erreur mérite une nouvelle tentative si elle est passagère : délai dépassé,
// surcharge (429) ou erreur serveur (5xx). Une clé invalide (401) ou une requête
// malformée (400) ne se retentent pas.
function isTransient(err) {
  if (!err) return false;
  if (/Délai dépassé/.test(err.message)) return true;
  if (err.status === 429) return true;
  if (err.status >= 500 && err.status <= 599) return true;
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function callMistral({
  prompt,
  systemInstruction,
  isJson = true,
  model = MISTRAL_DEFAULT_MODEL,
}) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY non configurée côté serveur.');
  }

  const attempts = [
    { model, timeoutMs: LARGE_TIMEOUT_MS },
    { model: MISTRAL_FALLBACK_MODEL, timeoutMs: SMALL_TIMEOUT_MS },
  ];

  let lastErr;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await callOnce({ prompt, systemInstruction, isJson, apiKey, ...attempts[i] });
    } catch (err) {
      lastErr = err;
      // On ne réessaie que sur erreur passagère, et jamais après la dernière tentative.
      if (!isTransient(err) || i === attempts.length - 1) break;
      await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}
