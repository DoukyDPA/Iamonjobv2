// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/profile/photo
//
// POST → reçoit une image (multipart/form-data, champ « file »), l'écrit dans le
//        bucket privé et l'associe au profil du conseiller. Renvoie le profil à
//        jour (avec URL de photo signée).
//
// Accès : rôle `conseiller` requis (custom claim), cookie __session.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { uploadConseillerPhoto, MAX_PHOTO_BYTES } from '@/lib/attachments';
import { setConseillerPhotoPath, getConseillerPublicProfile } from '@/lib/conseiller-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Image trop volumineuse (3 Mo maximum).' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { path } = await uploadConseillerPhoto({
      buffer,
      contentType: file.type,
      ownerId: uid,
    });
    await setConseillerPhotoPath(uid, path);

    const profile = await getConseillerPublicProfile(uid);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Erreur lors de l'envoi." }, { status: 500 });
  }
}
