// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/ocr
//
// POST → reçoit un tableau d'images (pages PDF rendues en canvas côté client)
//         et retourne le texte extrait via Mistral OCR (traitement UE).
//
// Usage : repli rare, quand pdf.js n'extrait presque aucun texte d'un PDF
//         (CV Canva, Illustrator, PDF scanné). Le client affiche alors un
//         avertissement : un tel CV ne passera pas la plupart des ATS.
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

const OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MODEL = 'mistral-ocr-latest';
const MAX_IMAGES = 10;
const PAGE_TIMEOUT_MS = 30_000;

// Mistral OCR renvoie du Markdown. On retire les références d'images
// (![img-0.jpeg](img-0.jpeg)) et les espaces invisibles qu'il insère.
function cleanMarkdown(md = '') {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function ocrPage({ data, mimeType = 'image/png' }, apiKey) {
  const res = await fetchWithTimeout(OCR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      document: { type: 'image_url', image_url: `data:${mimeType};base64,${data}` },
    }),
  }, PAGE_TIMEOUT_MS);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Mistral OCR ${res.status} : ${err.message || err.error?.message || 'erreur inconnue'}`);
  }
  const json = await res.json();
  return (json.pages || []).map((p) => cleanMarkdown(p.markdown)).join('\n\n');
}

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

  // ── Appel Mistral OCR (une requête par page, en parallèle) ────────────────
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISTRAL_API_KEY non configurée.' }, { status: 500 });
  }

  try {
    const pages = await Promise.all(images.map((img) => ocrPage(img, apiKey)));
    const text = pages
      .map((t, i) => (images.length > 1 ? `--- Page ${i + 1} ---\n${t}` : t))
      .join('\n\n')
      .trim();

    logEvent({ event: 'ocr', requestId, uid, status: 'ok', provider: 'mistral', pages: images.length });
    return NextResponse.json({ text });
  } catch (err) {
    logEvent({ event: 'ocr', requestId, uid, status: 'error', provider: 'mistral', error: err.message, level: 'error' });
    return NextResponse.json(
      { error: err.message || 'Erreur OCR.' },
      { status: 500 }
    );
  }
}
