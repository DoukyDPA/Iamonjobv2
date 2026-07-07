// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/avis
//
// GET → liste les demandes d'avis adressées au conseiller connecté, en attente
//       d'abord. Sert la file du tableau de bord.
//
// Accès : rôle `conseiller` requis (custom claim), cookie __session.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listAvisForConseiller } from '@/lib/avis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const avis = await listAvisForConseiller(uid);
    return NextResponse.json({ avis });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
