import { NextResponse } from 'next/server';

// Point de contrôle de santé pour l'hébergeur (Railway).
// Public, sans authentification, sans dépendance externe : il répond 200 tant
// que le process Next.js tourne. On NE teste PAS Firebase ni l'IA ici, sinon
// une panne d'un service tiers ferait redémarrer en boucle une app par ailleurs
// saine.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', ts: new Date().toISOString() },
    { status: 200 }
  );
}
