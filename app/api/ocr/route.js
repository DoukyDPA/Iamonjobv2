// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/ocr
//
// POST → reçoit un tableau d'images (pages PDF rendues en canvas côté client)
//         et retourne le texte extrait via Gemini Vision.
//
// Usage : fallback quand pdf.js échoue à extraire le texte d'un PDF complexe
//         (mise en page graphique, texte en image, fond coloré, etc.).
//
// Body attendu :
//   { images: [{ data: "<base64>", mimeType: "image/png" }] }
//
// Accès : authentifié uniquement, cookie __session requis.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { fetchWithTimeout } from '@/lib/http';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash';
const MAX_IMAGES = 10;

const SYSTEM = `Tu es un outil d'extraction de texte sur des images de CV.
Extrais TOUT le texte visible dans l'image, dans l'ordre de lecture naturel (de gauche à droite, de haut en bas).
Conserve la structure : sauts de ligne entre les sections, tirets devant les listes.
Ne reformule rien. Ne commente pas. Retourne uniquement le texte brut.`;

export async function POST(request) {
  const requestId = newRequestId();

  // ── Auth ────────────────────────────────────────────────────────────────
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

  // ── Body ─────────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const images = body?.images;
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'Aucune image fournie.' }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES} pages supportées.` },
      { status: 400 }
    );
  }

  // ── Appel Gemini Vision ───────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurée.' }, { status: 500 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  // Chaque page est un "part" image, suivi d'une instruction texte.
  const parts = [];
  images.forEach(({ data, mimeType = 'image/png' }, i) => {
    parts.push({ inline_data: { mime_type: mimeType, data } });
    if (images.length > 1) {
      parts.push({ text: `--- Page ${i + 1} ---` });
    }
  });
  parts.push({ text: 'Extrais tout le texte de ce CV.' });

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ parts }],
  };

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    }, 30_000);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini ${res.status} : ${err.error?.message || 'erreur inconnue'}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    logEvent({ event: 'ocr', requestId, uid, status: 'ok', pages: images.length });
    return NextResponse.json({ text });
  } catch (err) {
    logEvent({ event: 'ocr', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json(
      { error: err.message || 'Erreur OCR.' },
      { status: 500 }
    );
  }
}
