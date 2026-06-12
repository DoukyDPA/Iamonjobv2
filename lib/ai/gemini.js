// Provider Gemini (Google)
// Doc : https://ai.google.dev/gemini-api/docs

import { fetchWithTimeout } from '@/lib/http';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';

export async function callGemini({
  prompt,
  systemInstruction,
  isJson = true,
  model = GEMINI_DEFAULT_MODEL,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurée côté serveur.');
  }

  // La clé passe en EN-TÊTE (x-goog-api-key), jamais dans l'URL : une URL finit
  // dans les logs des proxys et du monitoring, donc une clé en query string fuit.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {},
  };

  if (isJson) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini API ${response.status} : ${errData.error?.message || 'erreur inconnue'}`
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
