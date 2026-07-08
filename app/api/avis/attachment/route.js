// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/avis/attachment  (côté personne accompagnée)
//
// POST → reçoit un fichier (multipart/form-data, champ « file »), l'écrit dans
//        le bucket privé et renvoie la métadonnée à joindre à une demande d'avis.
//
// Accès : rôle `beneficiaire`. Le fichier ne transite jamais en clair côté
// public : le bucket reste fermé, le téléchargement se fait par lien signé.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { uploadAttachment, MAX_ATTACHMENT_BYTES } from '@/lib/attachments';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });

  const requestId = newRequestId();
  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    if (!beneficiaire) {
      return NextResponse.json({ error: 'Aucun conseiller rattaché à votre compte.' }, { status: 404 });
    }
    if (!beneficiaire.conseillerUid) {
      return NextResponse.json({ error: 'Aucun conseiller rattaché à votre compte.' }, { status: 404 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (5 Mo maximum).' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await uploadAttachment({
      buffer,
      contentType: file.type,
      filename: file.name,
      ownerId: beneficiaire.id,
    });

    logEvent({ event: 'avis-attachment', requestId, uid, status: 'ok', size: meta.size });
    return NextResponse.json({ attachment: meta });
  } catch (err) {
    logEvent({ event: 'avis-attachment', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'envoi.' }, { status: 500 });
  }
}
