// Provider Mistral
// Doc : https://docs.mistral.ai/api/

import { fetchWithTimeout } from '@/lib/http';

export const MISTRAL_DEFAULT_MODEL = 'mistral-large-latest';

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

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  };

  if (isJson) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      `Mistral API ${response.status} : ${errData.message || errData.error?.message || 'erreur inconnue'}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
