// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/documents
//
// GET  → bibliothèque de documents de la structure (fiche d'engagement…)
// POST → dépose un document (multipart/form-data) :
//        titre, description?, texte?, mode ('en-ligne' | 'papier'), file?
//        Fichier PDF ou Word, 5 Mo maximum, rangé dans le bucket privé.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listDocuments, createDocument } from '@/lib/documents';
import { uploadAttachment, MAX_ATTACHMENT_BYTES } from '@/lib/attachments';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function GET(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json({ documents: await listDocuments({ conseillerUid: uid, structureId: structureId || 'default' }) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();
  try {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 });
    let fichier = null;
    const file = form.get('file');
    if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
      if (!DOC_TYPES.has(file.type)) return NextResponse.json({ error: 'PDF ou Word uniquement.' }, { status: 400 });
      if (file.size > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (5 Mo maximum).' }, { status: 413 });
      fichier = await uploadAttachment({
        buffer: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        filename: file.name,
        ownerId: structureId || 'default',
        prefix: 'documents',
      });
    }
    const res = await createDocument({
      conseillerUid: uid,
      structureId: structureId || 'default',
      titre: form.get('titre'),
      description: form.get('description'),
      texte: form.get('texte'),
      mode: form.get('mode'),
      fichier,
    });
    logEvent({ event: 'document-create', requestId, uid, status: 'ok' });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    logEvent({ event: 'document-create', requestId, uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || "L'enregistrement a échoué." }, { status: err.status || 500 });
  }
}
