// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/profile
//
// GET  → renvoie le profil du conseiller connecté (prénom + URL de photo signée)
// POST → met à jour le prénom
//
// Accès : rôle `conseiller` requis (custom claim), cookie __session.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getConseillerPublicProfile, setConseillerPrenom } from '@/lib/conseiller-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const profile = await getConseillerPublicProfile(uid);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const body = await request.json().catch(() => ({}));
    await setConseillerPrenom(uid, body.prenom);
    const profile = await getConseillerPublicProfile(uid);
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur enregistrement.' }, { status: 500 });
  }
}
